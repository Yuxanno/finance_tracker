import bcrypt from 'bcrypt';
import { getDatabase } from '../config/database.js';
import { sanitizeUser, toObjectId } from '../utils/helpers.js';

const DEFAULT_CATEGORIES = {
  expense: [
    { color: '#ef4444', icon: '🛒', names: { en: 'Groceries', ru: 'Продукты', uz: 'Oziq-ovqat' } },
    { color: '#f59e0b', icon: '🚗', names: { en: 'Transport', ru: 'Транспорт', uz: 'Transport' } },
    { color: '#ec4899', icon: '🛍️', names: { en: 'Shopping', ru: 'Покупки', uz: 'Xarid' } },
    { color: '#8b5cf6', icon: '📱', names: { en: 'Bills & Utilities', ru: 'Коммунальные', uz: 'Kommunal' } },
    { color: '#06b6d4', icon: '🎬', names: { en: 'Entertainment', ru: 'Развлечения', uz: 'Ko\'ngil ochar' } },
    { color: '#10b981', icon: '🍽️', names: { en: 'Restaurants', ru: 'Рестораны', uz: 'Restoranlar' } },
    { color: '#f97316', icon: '💊', names: { en: 'Health', ru: 'Здоровье', uz: 'Salomatlik' } },
    { color: '#6366f1', icon: '📚', names: { en: 'Education', ru: 'Образование', uz: 'Ta\'lim' } },
    { color: '#84cc16', icon: '✈️', names: { en: 'Travel', ru: 'Путешествия', uz: 'Sayohat' } },
    { color: '#a855f7', icon: '🏠', names: { en: 'Housing', ru: 'Жильё', uz: 'Uy-joy' } },
  ],
  income: [
    { color: '#10b981', icon: '💼', names: { en: 'Salary', ru: 'Зарплата', uz: 'Oylik' } },
    { color: '#3b82f6', icon: '💻', names: { en: 'Freelance', ru: 'Фриланс', uz: 'Frilanser' } },
    { color: '#6366f1', icon: '🏢', names: { en: 'Business', ru: 'Бизнес', uz: 'Biznes' } },
    { color: '#8b5cf6', icon: '📈', names: { en: 'Investments', ru: 'Инвестиции', uz: 'Investitsiya' } },
    { color: '#f59e0b', icon: '🎁', names: { en: 'Gifts', ru: 'Подарки', uz: 'Sovg\'alar' } },
    { color: '#ec4899', icon: '🏦', names: { en: 'Other Income', ru: 'Прочие доходы', uz: 'Boshqa daromad' } },
  ]
};

function buildCategories(userId, language = 'en') {
  const lang = ['en', 'ru', 'uz'].includes(language) ? language : 'en';
  const allCats = [];

  for (const type of ['expense', 'income']) {
    for (const cat of DEFAULT_CATEGORIES[type]) {
      allCats.push({
        name: cat.names[lang],
        type,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        userId,
        createdAt: new Date()
      });
    }
  }

  return allCats;
}

export class AuthService {
  constructor() {
    this.db = getDatabase();
  }

  async register(data) {
    const existing = await this.db.collection('users').findOne({ login: data.login });
    if (existing) {
      const error = new Error('Login already registered'); error.statusCode = 400; throw error;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = {
      username: data.username,
      login: data.login,
      password: hashedPassword,
      language: data.language || 'en',
      currency: data.currency || 'USD',
      theme: 'dark',
      role: data.role || 'user',
      createdAt: new Date()
    };

    const result = await this.db.collection('users').insertOne(user);
    const userId = result.insertedId;

    // Create default categories in user's language
    const categories = buildCategories(userId, user.language);
    await this.db.collection('categories').insertMany(categories);

    return sanitizeUser({ ...user, _id: userId });
  }

  async login(login, password) {
    const user = await this.db.collection('users').findOne({ login });
    if (!user) {
      const err = new Error('Invalid credentials'); err.statusCode = 400; throw err;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const err = new Error('Invalid credentials'); err.statusCode = 400; throw err;
    }

    return sanitizeUser(user);
  }

  async getUserById(userId) {
    const objId = toObjectId(userId.toString());
    const user = await this.db.collection('users').findOne({ _id: objId });
    if (!user) return null;
    // Ensure theme always has a default for older accounts
    if (!user.theme) user.theme = 'dark';
    return sanitizeUser(user);
  }

  async updateProfile(userId, data) {
    const objId = toObjectId(userId.toString());
    const update = {};
    if (data.username) update.username = data.username;
    if (data.language) update.language = data.language;
    if (data.currency) update.currency = data.currency;
    if (data.theme) update.theme = data.theme;

    await this.db.collection('users').updateOne(
      { _id: objId },
      { $set: update }
    );

    return this.getUserById(userId);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.db.collection('users').findOne({ _id: userId });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      const err = new Error('Current password is incorrect'); err.statusCode = 400; throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.db.collection('users').updateOne(
      { _id: userId },
      { $set: { password: hashedPassword } }
    );

    return true;
  }

  async seedDefaultCategories(userId, language = 'en') {
    const lang = ['en', 'ru', 'uz'].includes(language) ? language : 'en';
    const existingCats = await this.db.collection('categories')
      .find({ userId })
      .project({ name: 1 })
      .toArray();
    const existingNames = new Set(existingCats.map(c => c.name.toLowerCase()));

    const toInsert = [];
    for (const type of ['expense', 'income']) {
      for (const cat of DEFAULT_CATEGORIES[type]) {
        const name = cat.names[lang];
        if (!existingNames.has(name.toLowerCase())) {
          toInsert.push({
            name,
            type,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            userId,
            createdAt: new Date()
          });
        }
      }
    }

    if (toInsert.length > 0) {
      await this.db.collection('categories').insertMany(toInsert);
    }
    return toInsert.length;
  }

  async ensureAdmin(login, password) {
    const existing = await this.db.collection('users').findOne({ login });
    if (existing) {
      if (existing.role !== 'admin') {
        await this.db.collection('users').updateOne(
          { _id: existing._id },
          { $set: { role: 'admin' } }
        );
        console.log(`👤 User ${login} promoted to admin`);
      }
      return existing;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = {
      username: 'Administrator',
      login,
      password: hashedPassword,
      language: 'ru',
      currency: 'UZS',
      theme: 'dark',
      role: 'admin',
      createdAt: new Date()
    };

    const result = await this.db.collection('users').insertOne(admin);
    console.log(`✅ Admin user ${login} created`);
    return { ...admin, _id: result.insertedId };
  }
}
