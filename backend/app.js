'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');

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

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Talviro Chat API',
    version: '0.1.0',
    status: 'foundation',
    modules: ['health', 'database-health'],
    note: 'Authentication, chat, admin, reseller, FCM and LiveKit modules are being implemented in phases.'
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
