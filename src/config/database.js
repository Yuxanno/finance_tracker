import { MongoClient } from 'mongodb';
import { config } from './env.js';

let db = null;
let client = null;

export async function connectDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');

    client = new MongoClient(config.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db();

    // Test connection
    await db.admin().ping();
    console.log('✅ MongoDB connected successfully');

    // Create indexes in background (don't wait)
    createIndexes().catch(err => {
      console.warn('⚠️  Background index creation warning:', err.message);
    });

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  try {
    console.log('📊 Creating database indexes...');

    // Create indexes in parallel for faster startup
    await Promise.all([
      // Users indexes
      db.collection('users').createIndex({ login: 1 }, { unique: true, background: true }),

      // Accounts indexes
      db.collection('accounts').createIndex({ userId: 1, order: 1 }, { background: true }),

      // Categories indexes
      db.collection('categories').createIndex({ userId: 1, type: 1 }, { background: true }),

      // Transactions indexes - critical for performance
      db.collection('transactions').createIndex({ userId: 1, date: -1 }, { background: true }),
      db.collection('transactions').createIndex({ userId: 1, accountId: 1, date: -1 }, { background: true }),
      db.collection('transactions').createIndex({ userId: 1, type: 1, date: -1 }, { background: true }),
      db.collection('transactions').createIndex({ createdAt: -1 }, { background: true })
    ]);

    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️  Warning: Some indexes could not be created:', error.message);
    // Don't fail startup if indexes can't be created
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}
