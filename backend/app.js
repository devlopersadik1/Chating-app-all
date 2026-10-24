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
