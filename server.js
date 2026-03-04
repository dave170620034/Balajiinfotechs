/**
 * ═══════════════════════════════════════════════
 *  Balajiinfotechs – Backend Server
 *  Express + MySQL + MongoDB dual-database setup
 *  Run: node server.js
 *  Requires: npm install
 * ═══════════════════════════════════════════════
 */

'use strict';

const express  = require('express');
const path     = require('path');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectMySQL, saveMysql }  = require('./db/mysql');
const { connectMongo, saveMongo }  = require('./db/mongo');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers (relaxed CSP for fonts/CDNs)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting for contact form
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ── API Routes ────────────────────────────────

/**
 * POST /api/contact
 * Saves contact form submission to both MySQL and MongoDB
 */
app.post('/api/contact', limiter, async (req, res) => {
  try {
    const { name, email, subject, service, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    // Email format check
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const payload = {
      name:       String(name).slice(0, 120),
      email:      String(email).slice(0, 200),
      subject:    String(subject || '').slice(0, 200),
      service:    String(service || '').slice(0, 100),
      message:    String(message).slice(0, 2000),
      created_at: new Date()
    };

    // Save to both databases (parallel, non-blocking failures)
    const [mysqlResult, mongoResult] = await Promise.allSettled([
      saveMysql(payload),
      saveMongo(payload)
    ]);

    // Log results
    if (mysqlResult.status === 'rejected')
      console.error('[MySQL] Save failed:', mysqlResult.reason?.message);
    if (mongoResult.status === 'rejected')
      console.error('[MongoDB] Save failed:', mongoResult.reason?.message);

    // At least one must succeed
    const success = mysqlResult.status === 'fulfilled' || mongoResult.status === 'fulfilled';

    if (success) {
      return res.json({
        success: true,
        message: 'Your message has been received. We will contact you soon!',
        saved: {
          mysql:   mysqlResult.status === 'fulfilled',
          mongodb: mongoResult.status === 'fulfilled'
        }
      });
    } else {
      throw new Error('Both database saves failed');
    }

  } catch (err) {
    console.error('[API /contact] Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

/**
 * GET /api/contacts  (Admin – simple key protection)
 * Returns all contact submissions
 */
app.get('/api/contacts', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== (process.env.ADMIN_KEY || 'balaji-admin-2025')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { getAll } = require('./db/mysql');
    const rows = await getAll();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/health
 * Server health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Balajiinfotechs API',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback – serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Boot ──────────────────────────────────────
async function start() {
  try {
    await connectMySQL();
    console.log('[MySQL] Connected ✓');
  } catch (e) {
    console.warn('[MySQL] Connection failed (running without MySQL):', e.message);
  }

  try {
    await connectMongo();
    console.log('[MongoDB] Connected ✓');
  } catch (e) {
    console.warn('[MongoDB] Connection failed (running without MongoDB):', e.message);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Balajiinfotechs server running at http://localhost:${PORT}\n`);
  });
}

start();