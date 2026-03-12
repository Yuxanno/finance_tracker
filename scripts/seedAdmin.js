import { MongoClient } from 'mongodb';
console.log('Script started');
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthService } from '../src/services/auth.service.js';
import { connectDatabase, closeDatabase } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedAdmin() {
  try {
    await connectDatabase();
    const authService = new AuthService();
    
    const login = 'Shalo_on';
    const password = 'rav&yux2011';
    
    console.log(`🚀 Seeding admin user: ${login}...`);
    await authService.ensureAdmin(login, password);
    
    console.log('✨ Admin seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

seedAdmin();
