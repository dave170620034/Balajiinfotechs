/**
 * MongoDB Database Module
 * Uses native mongodb driver with connection caching
 */

'use strict';

const { MongoClient } = require('mongodb');

let client = null;
let db     = null;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME   = process.env.MONGO_DB  || 'balajiinfotechs';

/**
 * Connect to MongoDB and return database instance
 */
async function connectMongo() {
  client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  await client.connect();
  db = client.db(DB_NAME);

  // Ensure indexes exist
  const col = db.collection('contact_submissions');
  await col.createIndex({ email: 1 });
  await col.createIndex({ created_at: -1 });

  console.log(`[MongoDB] Connected to "${DB_NAME}" database`);
  return db;
}

/**
 * Save a contact form submission to MongoDB
 * @param {Object} payload
 * @returns {Object} insertedId
 */
async function saveMongo(payload) {
  if (!db) throw new Error('MongoDB not initialized');

  const col = db.collection('contact_submissions');
  const result = await col.insertOne({
    name:       payload.name,
    email:      payload.email,
    subject:    payload.subject || '',
    service:    payload.service || '',
    message:    payload.message,
    created_at: payload.created_at || new Date(),
    meta: {
      source: 'website_contact_form'
    }
  });

  console.log(`[MongoDB] Saved contact submission – ID: ${result.insertedId}`);
  return { insertedId: result.insertedId };
}

/**
 * Get all submissions from MongoDB (admin)
 * @returns {Array}
 */
async function getAllMongo() {
  if (!db) throw new Error('MongoDB not initialized');
  return db.collection('contact_submissions')
    .find({}, { projection: { 'meta': 0 } })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
}

/**
 * Graceful shutdown
 */
async function closeMongo() {
  if (client) await client.close();
}

process.on('SIGINT',  () => closeMongo().then(() => process.exit(0)));
process.on('SIGTERM', () => closeMongo().then(() => process.exit(0)));

module.exports = { connectMongo, saveMongo, getAllMongo, closeMongo };