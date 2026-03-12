import { connectDatabase, closeDatabase } from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing connection...');
  try {
    await connectDatabase();
    console.log('Connected!');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}
test();
