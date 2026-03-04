/**
 * MySQL Database Module
 * Uses mysql2 with connection pooling
 */

'use strict';

const mysql = require('mysql2/promise');

let pool = null;

/**
 * Establish MySQL connection pool and ensure table exists
 */
async function connectMySQL() {
  pool = mysql.createPool({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'balajiinfotechs',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000
  });

  // Test connection
  const conn = await pool.getConnection();
  await conn.release();

  // Create database if not exists, then table
  await pool.query(`
    CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'balajiinfotechs'}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(120)  NOT NULL,
      email       VARCHAR(200)  NOT NULL,
      subject     VARCHAR(200)  DEFAULT '',
      service     VARCHAR(100)  DEFAULT '',
      message     TEXT          NOT NULL,
      ip          VARCHAR(50)   DEFAULT NULL,
      created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

/**
 * Save a contact form submission to MySQL
 * @param {Object} payload - { name, email, subject, service, message, created_at }
 * @returns {Object} insertId
 */
async function saveMysql(payload) {
  if (!pool) throw new Error('MySQL pool not initialized');

  const [result] = await pool.execute(
    `INSERT INTO contact_submissions (name, email, subject, service, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.email,
      payload.subject || '',
      payload.service || '',
      payload.message,
      payload.created_at || new Date()
    ]
  );

  console.log(`[MySQL] Saved contact submission – ID: ${result.insertId}`);
  return { insertId: result.insertId };
}

/**
 * Retrieve all contact submissions (admin use)
 * @returns {Array}
 */
async function getAll() {
  if (!pool) throw new Error('MySQL pool not initialized');
  const [rows] = await pool.query(
    'SELECT id, name, email, subject, service, LEFT(message, 200) as message, created_at FROM contact_submissions ORDER BY created_at DESC LIMIT 500'
  );
  return rows;
}

module.exports = { connectMySQL, saveMysql, getAll };