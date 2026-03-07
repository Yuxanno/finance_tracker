import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, getDatabase } from './src/config/database.js';

async function testRegister() {
  try {
    console.log('1. Connecting to database...');
    await connectDatabase();
    console.log('2. Database connected!');
    
    const db = getDatabase();
    console.log('3. Got database reference');
    
    // Test basic insert
    const testResult = await db.collection('users').findOne({ email: 'test@test.com' });
    console.log('4. Test query worked:', testResult);

    // Now test what the register flow does
    const bcrypt = await import('bcrypt');
    console.log('5. bcrypt imported');
    
    const hashedPassword = await bcrypt.hash('test123', 10);
    console.log('6. Password hashed:', hashedPassword);

    console.log('\n✅ All steps passed! The registration flow should work.');
    console.log('\nChecking if the issue is with Zod validation...');
    
    const { z } = await import('zod');
    const schema = z.object({
      username: z.string().min(3).max(30),
      email: z.string().email(),
      password: z.string().min(6),
      language: z.enum(['en', 'ru', 'uz']).default('en'),
      currency: z.enum(['USD', 'EUR', 'RUB', 'UZS']).default('USD')
    });

    // Test with typical form data from frontend
    try {
      const result = schema.parse({ email: 'test@test.com', password: 'test123', username: 'TestUser' });
      console.log('7. Zod validation passed:', result);
    } catch (e) {
      console.log('7. ❌ Zod validation FAILED:', e.message);
    }

    // Test what the frontend actually sends (it might not send username for register)
    try {
      const result2 = schema.parse({ email: 'test@test.com', password: 'test123' });
      console.log('8. Zod validation without username:', result2);
    } catch (e) {
      console.log('8. ❌ Zod validation without username FAILED:', e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testRegister();
