import { connectDatabase } from './src/config/database.js';

console.log('Starting test...');

try {
  console.log('Connecting to database...');
  await connectDatabase();
  console.log('Database connected successfully!');
} catch (error) {
  console.error('Database connection failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

console.log('Test completed!');
process.exit(0);
