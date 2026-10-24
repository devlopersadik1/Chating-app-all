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
    const like = '%' + q.replace(/[\\%_]/g, '\\app.get('/api/v1', (req, res) => {') + '%';
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
    const params = [conversationId];
    let cursor = '';
    if (beforeId) { cursor = ' AND m.id < ?'; params.push(beforeId); }
    params.push(limit);
    const [rows] = await getPool().execute(
      `SELECT m.id, m.conversation_id, m.sender_user_id, u.name AS sender_name, u.username AS sender_username,
              m.message_type, m.body, m.media_path, m.media_mime, m.media_size_bytes,
              m.reply_to_message_id, m.created_at, m.edited_at
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

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Talviro Chat API',
    version: '0.2.0',
    status: 'authentication-foundation',
    modules: ['health', 'database-health', 'email-password-auth'],
    note: 'Phone OTP, chat, admin, reseller, FCM and LiveKit modules are planned for later phases.'
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
