import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const user = await db.collection('users').findOne({ login: 'Shalo_on' });
    fs.writeFileSync('check-admin.txt', JSON.stringify(user, null, 2));
  } catch (err) {
    fs.writeFileSync('check-admin.txt', err.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}
check();
