// Скрипт для удаления устаревшего индекса email_1 из коллекции users
// Запустить один раз: node fix-email-index.cjs

import('dotenv/lib/main.js').catch(() => {});

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function fixIndex() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Подключились к MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Посмотрим все индексы
    const indexes = await usersCollection.indexes();
    console.log('\n📋 Текущие индексы на коллекции users:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '[UNIQUE]' : '');
    });

    // Проверим есть ли email_1
    const emailIndex = indexes.find(idx => idx.name === 'email_1');
    if (emailIndex) {
      console.log('\n⚠️  Найден устаревший индекс email_1 — удаляем...');
      await usersCollection.dropIndex('email_1');
      console.log('✅ Индекс email_1 удалён!');
    } else {
      console.log('\n✅ Индекс email_1 не найден — всё чисто');
    }

    // Финальный список индексов
    const finalIndexes = await usersCollection.indexes();
    console.log('\n📋 Индексы после исправления:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '[UNIQUE]' : '');
    });

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    await client.close();
    console.log('\n🔌 Соединение закрыто');
  }
}

fixIndex();
