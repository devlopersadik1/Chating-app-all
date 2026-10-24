'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { status: 'error', message: 'Too many authentication attempts. Try again later.' } });

let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

function safeUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    profile_photo: row.profile_photo,
    bio: row.bio,
    is_online: Boolean(row.is_online),
    last_seen: row.last_seen,
    created_at: row.created_at
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'REPLACE_WITH_A_LONG_RANDOM_SECRET') {
    throw new Error('JWT_SECRET is not configured securely');
  }
  return jwt.sign({ sub: String(user.id), username: user.username }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'talviro-chat-api',
    audience: 'talviro-chat-client'
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ status: 'error', message: 'Authentication required' });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32 || secret === 'REPLACE_WITH_A_LONG_RANDOM_SECRET') {
      return res.status(503).json({ status: 'error', message: 'Authentication is not configured' });
    }
    const payload = jwt.verify(match[1], secret, {
      issuer: 'talviro-chat-api',
      audience: 'talviro-chat-client'
    });
    req.authUserId = Number(payload.sub);
    if (!Number.isSafeInteger(req.authUserId) || req.authUserId < 1) throw new Error('Invalid subject');
    next();
  } catch (_) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'talviro-chat-api' });
});

app.get('/api/v1/health/db', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT 1 AS connected');
    res.json({ status: 'ok', database: 'connected', result: rows[0].connected });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Email/password registration. Phone OTP is a separate phase and is not simulated here.
app.post('/api/v1/auth/register', authLimiter, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' && req.body.phone.trim() ? req.body.phone.trim() : null;
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ status: 'error', message: 'Name must be 2–100 characters' });
  }
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ status: 'error', message: 'Username must be 3–30 characters using letters, numbers, or underscore' });
  }
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'A valid email address is required' });
  }
  if (password.length < 10 || password.length > 72) {
    return res.status(400).json({ status: 'error', message: 'Password must be 10–72 characters' });
  }
  if (phone && phone.length > 20) {
    return res.status(400).json({ status: 'error', message: 'Phone number is too long' });
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'REPLACE_WITH_A_LONG_RANDOM_SECRET') {
    return res.status(503).json({ status: 'error', message: 'Authentication is not configured on the server' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await getPool().execute(
      'INSERT INTO users (name, username, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
      [name, username, email, phone, passwordHash]
    );
    const [rows] = await getPool().execute(
      'SELECT id, name, username, email, phone, profile_photo, bio, is_online, last_seen, created_at FROM users WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    const user = safeUser(rows[0]);
    return res.status(201).json({ status: 'ok', message: 'Account created', user, token: signToken(user) });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'Username, email, or phone is already registered' });
    }
    console.error('Registration failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not create account' });
  }
});

app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!identifier || identifier.length > 190 || !password || password.length > 72) {
    return res.status(400).json({ status: 'error', message: 'Email/username and password are required' });
  }

  try {
    const [rows] = await getPool().execute(
      'SELECT id, name, username, email, phone, password_hash, profile_photo, bio, is_online, last_seen, created_at, account_status FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );
    const row = rows[0];
    if (!row || !row.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ status: 'error', message: 'Invalid login details' });
    }
    if (row.account_status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'This account is not active' });
    }
    const user = safeUser(row);
    return res.json({ status: 'ok', message: 'Login successful', user, token: signToken(user) });
  } catch (err) {
    console.error('Login failed:', err.message);
    if (err.message === 'JWT_SECRET is not configured securely') {
      return res.status(503).json({ status: 'error', message: 'Authentication is not configured on the server' });
    }
    return res.status(500).json({ status: 'error', message: 'Could not log in' });
  }
});

app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      "SELECT id, name, username, email, phone, profile_photo, bio, is_online, last_seen, created_at FROM users WHERE id = ? AND account_status = 'active' LIMIT 1",
      [req.authUserId]
    );
    if (!rows[0]) return res.status(401).json({ status: 'error', message: 'Account not found or inactive' });
    return res.json({ status: 'ok', user: safeUser(rows[0]) });
  } catch (err) {
    console.error('Current-user lookup failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load account' });
  }
});


function positiveId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function isConversationMember(db, conversationId, userId) {
  const [rows] = await db.execute(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1',
    [conversationId, userId]
  );
  return rows.length > 0;
}

// Search users by public name/username. Never return email, phone, or private account fields.
app.get('/api/v1/users/search', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2 || q.length > 60) {
    return res.status(400).json({ status: 'error', message: 'Search must be 2–60 characters' });
  }
  try {
    const like = '%' + q + '%';
    const [rows] = await getPool().execute(
      "SELECT id, name, username, profile_photo, bio, is_online, last_seen FROM users WHERE account_status = 'active' AND id <> ? AND (name LIKE ? OR username LIKE ?) ORDER BY is_online DESC, name ASC LIMIT 25",
      [req.authUserId, like, like]
    );
    return res.json({ status: 'ok', users: rows.map(row => ({ ...row, is_online: Boolean(row.is_online) })) });
  } catch (err) {
    console.error('User search failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not search users' });
  }
});

// List conversations for the authenticated member.
app.get('/api/v1/conversations', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      `SELECT c.id, c.conversation_type, c.title, c.updated_at,
              m.id AS last_message_id, m.body AS last_message_body, m.message_type AS last_message_type,
              m.sender_user_id AS last_sender_user_id, m.created_at AS last_message_at,
              (SELECT COUNT(*) FROM conversation_members cm2 WHERE cm2.conversation_id = c.id AND cm2.left_at IS NULL) AS member_count
       FROM conversation_members mine
       JOIN conversations c ON c.id = mine.conversation_id
       LEFT JOIN messages m ON m.id = c.last_message_id AND m.deleted_at IS NULL
       WHERE mine.user_id = ? AND mine.left_at IS NULL
       ORDER BY COALESCE(m.created_at, c.updated_at) DESC, c.id DESC LIMIT 100`,
      [req.authUserId]
    );
    const ids = rows.map(row => row.id);
    let people = [];
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [members] = await getPool().execute(
        `SELECT cm.conversation_id, u.id, u.name, u.username, u.profile_photo, u.is_online
         FROM conversation_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id IN (${placeholders}) AND cm.left_at IS NULL AND u.id <> ? ORDER BY u.name ASC`,
        [...ids, req.authUserId]
      );
      people = members;
    }
    const byConversation = new Map();
    for (const person of people) {
      if (!byConversation.has(person.conversation_id)) byConversation.set(person.conversation_id, []);
      byConversation.get(person.conversation_id).push({ ...person, is_online: Boolean(person.is_online) });
    }
    return res.json({ status: 'ok', conversations: rows.map(row => ({ ...row, members: byConversation.get(row.id) || [] })) });
  } catch (err) {
    console.error('Conversation list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load conversations' });
  }
});

// Create a direct or group conversation. Members must be active users.
app.post('/api/v1/conversations', requireAuth, async (req, res) => {
  const type = req.body.conversation_type === 'group' ? 'group' : 'direct';
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const rawMembers = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];
  const memberIds = [...new Set(rawMembers.map(positiveId).filter(Boolean).filter(id => id !== req.authUserId))];
  if (rawMembers.length > 50 || memberIds.length !== rawMembers.filter(id => positiveId(id) && Number(id) !== req.authUserId).length) {
    return res.status(400).json({ status: 'error', message: 'Invalid member list' });
  }
  if (type === 'direct' && memberIds.length !== 1) {
    return res.status(400).json({ status: 'error', message: 'A direct conversation requires exactly one other user' });
  }
  if (type === 'group' && (memberIds.length < 2 || memberIds.length > 49)) {
    return res.status(400).json({ status: 'error', message: 'A group requires 2–49 other members' });
  }
  if (type === 'group' && (title.length < 2 || title.length > 120)) {
    return res.status(400).json({ status: 'error', message: 'Group title must be 2–120 characters' });
  }

  const db = await getPool().getConnection();
  try {
    const [users] = await db.execute(
      `SELECT id FROM users WHERE account_status = 'active' AND id IN (${memberIds.map(() => '?').join(',')})`,
      memberIds
    );
    if (users.length !== memberIds.length) {
      return res.status(400).json({ status: 'error', message: 'One or more users do not exist or are inactive' });
    }

    if (type === 'direct') {
      const otherId = memberIds[0];
      const [blocked] = await db.execute(
        'SELECT 1 FROM user_blocks WHERE (blocker_user_id = ? AND blocked_user_id = ?) OR (blocker_user_id = ? AND blocked_user_id = ?) LIMIT 1',
        [req.authUserId, otherId, otherId, req.authUserId]
      );
      if (blocked.length) return res.status(403).json({ status: 'error', message: 'This conversation is unavailable' });
      const [existing] = await db.execute(
        `SELECT c.id FROM conversations c
         JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ? AND a.left_at IS NULL
         JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ? AND b.left_at IS NULL
         WHERE c.conversation_type = 'direct'
           AND (SELECT COUNT(*) FROM conversation_members x WHERE x.conversation_id = c.id AND x.left_at IS NULL) = 2
         LIMIT 1`,
        [req.authUserId, otherId]
      );
      if (existing[0]) return res.json({ status: 'ok', conversation_id: existing[0].id, existing: true });
    }

    await db.beginTransaction();
    const [created] = await db.execute(
      'INSERT INTO conversations (conversation_type, title, created_by) VALUES (?, ?, ?)',
      [type, type === 'group' ? title : null, req.authUserId]
    );
    const conversationId = created.insertId;
    const values = [conversationId, req.authUserId, 'owner'];
    await db.execute(
      'INSERT INTO conversation_members (conversation_id, user_id, member_role) VALUES (?, ?, ?)',
      values
    );
    for (const memberId of memberIds) {
      await db.execute(
        'INSERT INTO conversation_members (conversation_id, user_id, member_role) VALUES (?, ?, ?)',
        [conversationId, memberId, type === 'group' ? 'member' : 'member']
      );
    }
    await db.commit();
    return res.status(201).json({ status: 'ok', conversation_id: conversationId, existing: false });
  } catch (err) {
    await db.rollback();
    console.error('Conversation creation failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not create conversation' });
  } finally {
    db.release();
  }
});

// Fetch the latest messages. before_id supports simple backwards pagination.
app.get('/api/v1/conversations/:id/messages', requireAuth, async (req, res) => {
  const conversationId = positiveId(req.params.id);
  const beforeId = req.query.before_id === undefined ? null : positiveId(req.query.before_id);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
  if (!conversationId || (req.query.before_id !== undefined && !beforeId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid conversation or pagination ID' });
  }
  try {
    if (!(await isConversationMember(getPool(), conversationId, req.authUserId))) {
      return res.status(403).json({ status: 'error', message: 'Conversation unavailable' });
    }
    await markMessagesSeen(getPool(), conversationId, req.authUserId);
    const params = [conversationId];
    let cursor = '';
    if (beforeId) { cursor = ' AND m.id < ?'; params.push(beforeId); }
    params.push(limit);
    const [rows] = await getPool().execute(
      `SELECT m.id, m.conversation_id, m.sender_user_id, u.name AS sender_name, u.username AS sender_username,
              m.message_type, m.body, m.media_path, m.media_mime, m.media_size_bytes,
              m.reply_to_message_id, m.created_at, m.edited_at,
              (SELECT COUNT(*) FROM message_receipts mr WHERE mr.message_id = m.id AND mr.delivered_at IS NOT NULL) AS delivered_count,
              (SELECT COUNT(*) FROM message_receipts mr WHERE mr.message_id = m.id AND mr.read_at IS NOT NULL) AS read_count
       FROM messages m JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = ? AND m.deleted_at IS NULL ${cursor}
       ORDER BY m.id DESC LIMIT ?`,
      params
    );
    return res.json({ status: 'ok', messages: rows.reverse() });
  } catch (err) {
    console.error('Message list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load messages' });
  }
});

// Send a text message. Media upload endpoints will be added separately with file validation.
app.post('/api/v1/conversations/:id/messages', requireAuth, async (req, res) => {
  const conversationId = positiveId(req.params.id);
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const replyTo = req.body.reply_to_message_id == null ? null : positiveId(req.body.reply_to_message_id);
  if (!conversationId || !body || body.length > 4000) {
    return res.status(400).json({ status: 'error', message: 'Message must be 1–4000 characters' });
  }
  if (req.body.message_type && req.body.message_type !== 'text') {
    return res.status(400).json({ status: 'error', message: 'Only text messages are supported currently' });
  }
  if (req.body.reply_to_message_id != null && !replyTo) {
    return res.status(400).json({ status: 'error', message: 'Invalid reply message ID' });
  }
  const db = await getPool().getConnection();
  try {
    await db.beginTransaction();
    if (!(await isConversationMember(db, conversationId, req.authUserId))) {
      await db.rollback();
      return res.status(403).json({ status: 'error', message: 'Conversation unavailable' });
    }
    if (replyTo) {
      const [parent] = await db.execute(
        'SELECT id FROM messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL LIMIT 1',
        [replyTo, conversationId]
      );
      if (!parent.length) {
        await db.rollback();
        return res.status(400).json({ status: 'error', message: 'Reply target not found in this conversation' });
      }
    }
    const [created] = await db.execute(
      "INSERT INTO messages (conversation_id, sender_user_id, message_type, body, reply_to_message_id) VALUES (?, ?, 'text', ?, ?)",
      [conversationId, req.authUserId, body, replyTo]
    );
    await db.execute('UPDATE conversations SET last_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [created.insertId, conversationId]);
    await db.execute(
      'INSERT INTO message_receipts (message_id, user_id) SELECT ?, cm.user_id FROM conversation_members cm WHERE cm.conversation_id = ? AND cm.user_id <> ? AND cm.left_at IS NULL',
      [created.insertId, conversationId, req.authUserId]
    );
    const [rows] = await db.execute(
      'SELECT m.id, m.conversation_id, m.sender_user_id, u.name AS sender_name, u.username AS sender_username, m.message_type, m.body, m.reply_to_message_id, m.created_at FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.id = ? LIMIT 1',
      [created.insertId]
    );
    await db.commit();
    return res.status(201).json({ status: 'ok', message: rows[0] });
  } catch (err) {
    await db.rollback();
    console.error('Message send failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not send message' });
  } finally {
    db.release();
  }
});


// Mark messages in a conversation as delivered/read for the current member.
// Fetching history is treated as the user opening that conversation.
async function markMessagesSeen(db, conversationId, userId, throughMessageId = null) {
  const params = [conversationId, userId, userId];
  let throughClause = '';
  if (throughMessageId !== null) {
    throughClause = ' AND m.id <= ?';
    params.push(throughMessageId);
  }
  await db.execute(
    `UPDATE message_receipts mr
     JOIN messages m ON m.id = mr.message_id
     SET mr.delivered_at = COALESCE(mr.delivered_at, CURRENT_TIMESTAMP),
         mr.read_at = COALESCE(mr.read_at, CURRENT_TIMESTAMP)
     WHERE m.conversation_id = ? AND mr.user_id = ? AND m.sender_user_id <> ?
       AND m.deleted_at IS NULL ${throughClause}`,
    params
  );
  const [latest] = await db.execute(
    'SELECT MAX(m.id) AS latest_id FROM messages m WHERE m.conversation_id = ? AND m.sender_user_id <> ? AND m.deleted_at IS NULL',
    [conversationId, userId]
  );
  if (latest[0]?.latest_id) {
    await db.execute(
      'UPDATE conversation_members SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL',
      [throughMessageId || latest[0].latest_id, conversationId, userId]
    );
  }
}

// Receipt status is only exposed to the sender, via per-message aggregate counts.
app.post('/api/v1/conversations/:id/receipts/read', requireAuth, async (req, res) => {
  const conversationId = positiveId(req.params.id);
  const throughMessageId = req.body.message_id == null ? null : positiveId(req.body.message_id);
  if (!conversationId || (req.body.message_id != null && !throughMessageId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid conversation or message ID' });
  }
  const db = await getPool().getConnection();
  try {
    if (!(await isConversationMember(db, conversationId, req.authUserId))) {
      return res.status(403).json({ status: 'error', message: 'Conversation unavailable' });
    }
    if (throughMessageId) {
      const [target] = await db.execute(
        'SELECT id FROM messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL LIMIT 1',
        [throughMessageId, conversationId]
      );
      if (!target.length) return res.status(400).json({ status: 'error', message: 'Message not found in this conversation' });
    }
    await markMessagesSeen(db, conversationId, req.authUserId, throughMessageId);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Read receipt update failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not update read status' });
  } finally {
    db.release();
  }
});


// Contacts API: private contact-book entries only; no global phone-number lookup.
app.get('/api/v1/contacts', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      "SELECT c.id, c.contact_user_id, c.display_name, c.phone_e164, c.private_note, c.is_favorite, c.created_at, u.username AS matched_username, u.profile_photo AS matched_profile_photo FROM user_contacts c LEFT JOIN users u ON u.id = c.contact_user_id AND u.account_status = 'active' WHERE c.owner_user_id = ? ORDER BY c.is_favorite DESC, c.display_name ASC LIMIT 500",
      [req.authUserId]
    );
    return res.json({ status: 'ok', contacts: rows });
  } catch (err) {
    console.error('Contact list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load contacts. Check migration 0008.' });
  }
});

app.post('/api/v1/contacts', requireAuth, async (req, res) => {
  const displayName = typeof req.body.display_name === 'string' ? req.body.display_name.trim() : '';
  const phone = typeof req.body.phone_e164 === 'string' && req.body.phone_e164.trim() ? req.body.phone_e164.trim() : null;
  const note = typeof req.body.private_note === 'string' ? req.body.private_note.trim() : null;
  const targetId = req.body.contact_user_id == null ? null : positiveId(req.body.contact_user_id);
  if (!displayName || displayName.length > 120 || (note && note.length > 500) ||
      (phone && !/^\\+[1-9]\\d{6,14}$/.test(phone)) ||
      (req.body.contact_user_id != null && !targetId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid contact fields. Use E.164 format for phone numbers.' });
  }
  try {
    if (targetId) {
      const [target] = await getPool().execute("SELECT id FROM users WHERE id = ? AND account_status = 'active' LIMIT 1", [targetId]);
      if (!target.length || targetId === req.authUserId) return res.status(400).json({ status: 'error', message: 'Matched account unavailable.' });
    }
    const [created] = await getPool().execute(
      'INSERT INTO user_contacts (owner_user_id, contact_user_id, display_name, phone_e164, private_note) VALUES (?, ?, ?, ?, ?)',
      [req.authUserId, targetId, displayName, phone, note || null]
    );
    return res.status(201).json({ status: 'ok', contact: { id: created.insertId, contact_user_id: targetId, display_name: displayName, phone_e164: phone, private_note: note || null, is_favorite: 0 } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ status: 'error', message: 'Contact account already saved.' });
    console.error('Contact create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not save contact. Check migration 0008.' });
  }
});

app.get('/api/v1/chat-folders', requireAuth, async (req, res) => {
  try {
    const [folders] = await getPool().execute(
      'SELECT id, title, icon, filter_json, sort_order, created_at FROM chat_folders WHERE user_id = ? ORDER BY sort_order, id LIMIT 100',
      [req.authUserId]
    );
    return res.json({ status: 'ok', folders });
  } catch (err) {
    console.error('Folder list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load folders. Check migration 0008.' });
  }
});

app.post('/api/v1/chat-folders', requireAuth, async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const icon = typeof req.body.icon === 'string' ? req.body.icon.trim() : null;
  if (!title || title.length > 60 || (icon && icon.length > 40)) return res.status(400).json({ status: 'error', message: 'Folder title is required (max 60 characters).' });
  try {
    const [count] = await getPool().execute('SELECT COUNT(*) AS total FROM chat_folders WHERE user_id = ?', [req.authUserId]);
    if (Number(count[0].total) >= 20) return res.status(409).json({ status: 'error', message: 'Maximum 20 folders per account.' });
    const [created] = await getPool().execute('INSERT INTO chat_folders (user_id, title, icon) VALUES (?, ?, ?)', [req.authUserId, title, icon || null]);
    return res.status(201).json({ status: 'ok', folder: { id: created.insertId, title, icon: icon || null, sort_order: 0 } });
  } catch (err) {
    console.error('Folder create failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not create folder. Check migration 0008.' });
  }
});

app.patch('/api/v1/conversations/:id/preferences', requireAuth, async (req, res) => {
  const id = positiveId(req.params.id);
  const keys = ['is_archived', 'is_pinned', 'is_muted', 'is_marked_unread'];
  const values = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      if (typeof req.body[key] !== 'boolean') return res.status(400).json({ status: 'error', message: key + ' must be boolean' });
      values[key] = req.body[key] ? 1 : 0;
    }
  }
  if (!id || !Object.keys(values).length) return res.status(400).json({ status: 'error', message: 'Invalid conversation or preferences' });
  try {
    const [member] = await getPool().execute('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1', [id, req.authUserId]);
    if (!member.length) return res.status(403).json({ status: 'error', message: 'Conversation unavailable' });
    const [old] = await getPool().execute('SELECT user_id FROM conversation_user_preferences WHERE user_id = ? AND conversation_id = ? LIMIT 1', [req.authUserId, id]);
    if (old.length) {
      await getPool().execute(
        'UPDATE conversation_user_preferences SET is_archived = COALESCE(?, is_archived), is_pinned = COALESCE(?, is_pinned), is_muted = COALESCE(?, is_muted), is_marked_unread = COALESCE(?, is_marked_unread) WHERE user_id = ? AND conversation_id = ?',
        [values.is_archived ?? null, values.is_pinned ?? null, values.is_muted ?? null, values.is_marked_unread ?? null, req.authUserId, id]
      );
    } else {
      await getPool().execute(
        'INSERT INTO conversation_user_preferences (user_id, conversation_id, is_archived, is_pinned, is_muted, is_marked_unread) VALUES (?, ?, ?, ?, ?, ?)',
        [req.authUserId, id, values.is_archived ?? 0, values.is_pinned ?? 0, values.is_muted ?? 0, values.is_marked_unread ?? 0]
      );
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Chat preferences failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not save preferences. Check migration 0008.' });
  }
});


app.post('/api/v1/chat-folders/:id/items', requireAuth, async (req, res) => {
  const folderId = positiveId(req.params.id);
  const conversationId = positiveId(req.body.conversation_id);
  if (!folderId || !conversationId) return res.status(400).json({ status: 'error', message: 'Valid folder and conversation IDs are required' });
  try {
    const [folder] = await getPool().execute('SELECT id FROM chat_folders WHERE id = ? AND user_id = ? LIMIT 1', [folderId, req.authUserId]);
    if (!folder.length) return res.status(404).json({ status: 'error', message: 'Folder not found' });
    const [member] = await getPool().execute('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1', [conversationId, req.authUserId]);
    if (!member.length) return res.status(403).json({ status: 'error', message: 'Conversation unavailable' });
    await getPool().execute('INSERT IGNORE INTO chat_folder_items (folder_id, conversation_id) VALUES (?, ?)', [folderId, conversationId]);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Folder item add failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not add conversation to folder. Check migration 0008.' });
  }
});

app.delete('/api/v1/chat-folders/:id/items/:conversationId', requireAuth, async (req, res) => {
  const folderId = positiveId(req.params.id);
  const conversationId = positiveId(req.params.conversationId);
  if (!folderId || !conversationId) return res.status(400).json({ status: 'error', message: 'Invalid folder or conversation ID' });
  try {
    const [folder] = await getPool().execute('SELECT id FROM chat_folders WHERE id = ? AND user_id = ? LIMIT 1', [folderId, req.authUserId]);
    if (!folder.length) return res.status(404).json({ status: 'error', message: 'Folder not found' });
    await getPool().execute('DELETE FROM chat_folder_items WHERE folder_id = ? AND conversation_id = ?', [folderId, conversationId]);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Folder item removal failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not remove conversation from folder. Check migration 0008.' });
  }
});

app.get('/api/v1/chat-folders/:id/items', requireAuth, async (req, res) => {
  const folderId = positiveId(req.params.id);
  if (!folderId) return res.status(400).json({ status: 'error', message: 'Invalid folder ID' });
  try {
    const [folder] = await getPool().execute('SELECT id FROM chat_folders WHERE id = ? AND user_id = ? LIMIT 1', [folderId, req.authUserId]);
    if (!folder.length) return res.status(404).json({ status: 'error', message: 'Folder not found' });
    const [rows] = await getPool().execute('SELECT cfi.conversation_id FROM chat_folder_items cfi JOIN conversation_members cm ON cm.conversation_id = cfi.conversation_id AND cm.user_id = ? AND cm.left_at IS NULL WHERE cfi.folder_id = ? ORDER BY cfi.created_at DESC LIMIT 500', [req.authUserId, folderId]);
    return res.json({ status: 'ok', conversation_ids: rows.map(row => Number(row.conversation_id)) });
  } catch (err) {
    console.error('Folder item list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load folder items. Check migration 0008.' });
  }
});


function normalizeSpaceUsername(value) {
  if (value == null || value === '') return null;
  const username = String(value).trim().toLowerCase();
  return /^[a-z0-9_]{4,40}$/.test(username) ? username : false;
}

async function getChannelMembership(db, channelId, userId) {
  const [rows] = await db.execute(
    "SELECT member_role, membership_status FROM channel_members WHERE channel_id = ? AND user_id = ? LIMIT 1",
    [channelId, userId]
  );
  return rows[0] || null;
}

function canManageSpace(membership) {
  return Boolean(membership && membership.membership_status === 'active' &&
    ['owner', 'admin', 'moderator'].includes(membership.member_role));
}

// Create a channel or group. Owner membership is created atomically.
app.post('/api/v1/channels', requireAuth, async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const spaceType = req.body.space_type === 'group' ? 'group' : req.body.space_type === 'channel' ? 'channel' : null;
  const visibility = req.body.visibility === 'private' ? 'private' : req.body.visibility === 'public' ? 'public' : 'public';
  const username = normalizeSpaceUsername(req.body.username);
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const joinApproval = req.body.join_approval_required === true || req.body.join_approval_required === 1;
  const postingPermission = req.body.posting_permission === 'members' && spaceType === 'group' ? 'members' : 'admins_only';

  if (!spaceType || title.length < 2 || title.length > 120 || description.length > 1000 || username === false) {
    return res.status(400).json({ status: 'error', message: 'Invalid space type, title, description, or username (username: 4–40 letters, numbers, underscore)' });
  }
  try {
    const db = await getPool().getConnection();
    try {
      await db.beginTransaction();
      const [created] = await db.execute(
        'INSERT INTO channels (owner_user_id, title, username, description, space_type, visibility, join_approval_required, posting_permission) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.authUserId, title, username, description || null, spaceType, visibility, joinApproval ? 1 : 0, postingPermission]
      );
      await db.execute(
        "INSERT INTO channel_members (channel_id, user_id, member_role, membership_status) VALUES (?, ?, 'owner', 'active')",
        [created.insertId, req.authUserId]
      );
      await db.commit();
      return res.status(201).json({ status: 'ok', channel: { id: created.insertId, title, username, description: description || null, space_type: spaceType, visibility, join_approval_required: joinApproval, posting_permission: postingPermission, member_role: 'owner', membership_status: 'active' } });
    } catch (err) {
      await db.rollback();
      if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ status: 'error', message: 'That public username is already in use' });
      throw err;
    } finally {
      db.release();
    }
  } catch (err) {
    console.error('Channel/group creation failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not create channel/group. Check migration 0005.' });
  }
});

// List spaces the signed-in user belongs to.
app.get('/api/v1/channels/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT c.id, c.owner_user_id, c.title, c.username, c.description, c.space_type, c.visibility, c.join_approval_required, c.posting_permission, c.member_count, c.status, cm.member_role, cm.membership_status FROM channel_members cm JOIN channels c ON c.id = cm.channel_id WHERE cm.user_id = ? AND cm.membership_status IN (\'active\', \'pending\') AND c.status = \'active\' ORDER BY c.updated_at DESC, c.id DESC LIMIT 100',
      [req.authUserId]
    );
    return res.json({ status: 'ok', channels: rows });
  } catch (err) {
    console.error('My channels/groups list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load channels/groups. Check migration 0005.' });
  }
});

// Public discovery never exposes private spaces.
app.get('/api/v1/channels/discover', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = ['channel', 'group'].includes(req.query.space_type) ? req.query.space_type : null;
  if (q.length > 80) return res.status(400).json({ status: 'error', message: 'Search query is too long' });
  try {
    const params = [];
    let where = "c.status = 'active' AND c.visibility = 'public'";
    if (type) { where += ' AND c.space_type = ?'; params.push(type); }
    if (q) { where += ' AND (c.title LIKE ? OR c.username LIKE ?)'; params.push('%' + q + '%', '%' + q + '%'); }
    params.push(req.authUserId);
    const [rows] = await getPool().execute(
      'SELECT c.id, c.title, c.username, c.description, c.space_type, c.member_count, c.is_verified, cm.membership_status AS my_membership_status FROM channels c LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ? WHERE ' + where + ' ORDER BY c.member_count DESC, c.id DESC LIMIT 50',
      [req.authUserId, ...params.slice(0, -1)]
    );
    return res.json({ status: 'ok', channels: rows });
  } catch (err) {
    console.error('Channel discovery failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not discover channels/groups. Check migration 0005.' });
  }
});

// Join a public space; private spaces require a separate invite flow, not implemented yet.
app.post('/api/v1/channels/:id/join', requireAuth, async (req, res) => {
  const channelId = positiveId(req.params.id);
  if (!channelId) return res.status(400).json({ status: 'error', message: 'Invalid channel/group ID' });
  const db = await getPool().getConnection();
  try {
    await db.beginTransaction();
    const [spaces] = await db.execute(
      "SELECT id, visibility, join_approval_required, status FROM channels WHERE id = ? LIMIT 1 FOR UPDATE",
      [channelId]
    );
    const space = spaces[0];
    if (!space || space.status !== 'active' || space.visibility !== 'public') {
      await db.rollback();
      return res.status(404).json({ status: 'error', message: 'Public channel/group not found' });
    }
    const existing = await getChannelMembership(db, channelId, req.authUserId);
    if (existing && existing.membership_status === 'active') {
      await db.commit();
      return res.json({ status: 'ok', membership_status: 'active', already_member: true });
    }
    const status = space.join_approval_required ? 'pending' : 'active';
    await db.execute(
      "INSERT INTO channel_members (channel_id, user_id, member_role, membership_status) VALUES (?, ?, 'member', ?) ON DUPLICATE KEY UPDATE membership_status = VALUES(membership_status), member_role = 'member', joined_at = CURRENT_TIMESTAMP",
      [channelId, req.authUserId, status]
    );
    if (status === 'active') await db.execute('UPDATE channels SET member_count = member_count + 1 WHERE id = ?', [channelId]);
    await db.commit();
    return res.status(status === 'pending' ? 202 : 200).json({ status: 'ok', membership_status: status });
  } catch (err) {
    await db.rollback();
    console.error('Channel/group join failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not join channel/group. Check migration 0005.' });
  } finally {
    db.release();
  }
});

// List posts only for active members; public content is not exposed until join/discovery rules are expanded.
app.get('/api/v1/channels/:id/posts', requireAuth, async (req, res) => {
  const channelId = positiveId(req.params.id);
  const beforeId = req.query.before_id === undefined ? null : positiveId(req.query.before_id);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '30'), 10) || 30));
  if (!channelId || (req.query.before_id !== undefined && !beforeId)) return res.status(400).json({ status: 'error', message: 'Invalid channel/group or pagination ID' });
  try {
    const membership = await getChannelMembership(getPool(), channelId, req.authUserId);
    if (!membership || membership.membership_status !== 'active') return res.status(403).json({ status: 'error', message: 'Join this channel/group to view posts' });
    const params = [channelId];
    let cursor = '';
    if (beforeId) { cursor = ' AND p.id < ?'; params.push(beforeId); }
    params.push(limit);
    const [rows] = await getPool().execute(
      'SELECT p.id, p.channel_id, p.author_user_id, u.name AS author_name, u.username AS author_username, p.post_type, p.body, p.media_path, p.media_mime, p.media_size_bytes, p.is_pinned, p.comments_enabled, p.views_count, p.created_at FROM channel_posts p JOIN users u ON u.id = p.author_user_id WHERE p.channel_id = ? AND p.deleted_at IS NULL' + cursor + ' ORDER BY p.id DESC LIMIT ?',
      params
    );
    return res.json({ status: 'ok', posts: rows.reverse() });
  } catch (err) {
    console.error('Channel/group posts list failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not load posts. Check migration 0005.' });
  }
});

// Text-only post creation. Media uploads and post editing are separate milestones.
app.post('/api/v1/channels/:id/posts', requireAuth, async (req, res) => {
  const channelId = positiveId(req.params.id);
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!channelId || !body || body.length > 4000) return res.status(400).json({ status: 'error', message: 'Post text must be 1–4000 characters' });
  try {
    const db = await getPool().getConnection();
    try {
      await db.beginTransaction();
      const [spaces] = await db.execute("SELECT id, space_type, posting_permission, status FROM channels WHERE id = ? LIMIT 1 FOR UPDATE", [channelId]);
      const space = spaces[0];
      const membership = await getChannelMembership(db, channelId, req.authUserId);
      if (!space || space.status !== 'active' || !membership || membership.membership_status !== 'active') {
        await db.rollback();
        return res.status(403).json({ status: 'error', message: 'Active channel/group membership required' });
      }
      if (space.space_type === 'channel' && !canManageSpace(membership)) {
        await db.rollback();
        return res.status(403).json({ status: 'error', message: 'Only channel admins can post' });
      }
      if (space.space_type === 'group' && space.posting_permission === 'admins_only' && !canManageSpace(membership)) {
        await db.rollback();
        return res.status(403).json({ status: 'error', message: 'Only group admins can post' });
      }
      const [created] = await db.execute(
        "INSERT INTO channel_posts (channel_id, author_user_id, post_type, body) VALUES (?, ?, 'text', ?)",
        [channelId, req.authUserId, body]
      );
      await db.execute('UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [channelId]);
      await db.commit();
      return res.status(201).json({ status: 'ok', post: { id: created.insertId, channel_id: channelId, author_user_id: req.authUserId, post_type: 'text', body } });
    } catch (err) {
      await db.rollback();
      throw err;
    } finally {
      db.release();
    }
  } catch (err) {
    console.error('Channel/group post creation failed:', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not create post. Check migration 0005.' });
  }
});

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Talviro Chat API',
    version: '0.3.0',
    status: 'text-chat-foundation',
    modules: ['health', 'database-health', 'email-password-auth', 'user-search', 'conversations', 'text-messages', 'read-receipts', 'channels-groups', 'channel-posts'],
    note: 'Channel/group APIs currently support create, list, public discovery, public join with optional approval, and text posts. Media uploads, role-management APIs, moderation/admin review, phone OTP, FCM, LiveKit, and WebSocket real-time are not implemented yet.'
  });
});

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err.message);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log('Talviro Chat API listening on port ' + port));
