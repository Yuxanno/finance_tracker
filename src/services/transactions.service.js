import { getDatabase } from '../config/database.js';
import { toObjectId } from '../utils/helpers.js';

export class TransactionsService {
  constructor() {
    this.db = getDatabase();
  }

  async getTransactions(userId, filters = {}) {
    const userObjId = toObjectId(userId.toString());
    const query = { userId: userObjId };

    if (filters.accountId) {
      query.accountId = toObjectId(filters.accountId);
    }

    if (filters.categoryId) {
      query.categoryId = toObjectId(filters.categoryId);
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.note = { $regex: filters.search, $options: 'i' };
    }

    const transactions = await this.db.collection('transactions')
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(filters.skip || 0)
      .limit(filters.limit || 100)
      .toArray();

    // Populate category and account info
    const populated = await Promise.all(transactions.map(async (t) => {
      const [category, account] = await Promise.all([
        this.db.collection('categories').findOne({ _id: t.categoryId }),
        this.db.collection('accounts').findOne({ _id: t.accountId })
      ]);

      // Use live category data, or fall back to snapshot saved at deletion time
      const categoryData = category
        ? { _id: category._id, name: category.name, icon: category.icon, color: category.color }
        : t.categorySnapshot
          ? { name: t.categorySnapshot.name, icon: t.categorySnapshot.icon, color: t.categorySnapshot.color }
          : null;

      return {
        ...t,
        category: categoryData,
        account: account ? { _id: account._id, name: account.name } : null
      };
    }));

    return populated;
  }

  async getTodayTransactions(userId, accountId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.getTransactions(userId, {
      startDate: today.toISOString(),
      accountId,
      limit: 50
    });
  }

  async createTransaction(userId, data) {
    const userObjId = toObjectId(userId.toString());
    const transaction = {
      userId: userObjId,
      accountId: toObjectId(data.accountId),
      categoryId: toObjectId(data.categoryId),
      type: data.type,
      amount: data.amount,
      note: data.note || '',
      date: data.date ? new Date(data.date) : new Date(),
      createdAt: new Date()
    };

    const result = await this.db.collection('transactions').insertOne(transaction);

    // Update account balance
    const increment = data.type === 'income' ? data.amount : -data.amount;
    await this.db.collection('accounts').updateOne(
      { _id: transaction.accountId },
      { $inc: { balance: increment } }
    );

    return { ...transaction, _id: result.insertedId };
  }

  async updateTransaction(userId, transactionId, data) {
    const userObjId = toObjectId(userId.toString());
    const objId = toObjectId(transactionId);
    const oldTransaction = await this.db.collection('transactions').findOne({
      _id: objId,
      userId: userObjId
    });

    if (!oldTransaction) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      throw err;
    }

    // Revert old balance change
    const oldIncrement = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
    await this.db.collection('accounts').updateOne(
      { _id: oldTransaction.accountId },
      { $inc: { balance: oldIncrement } }
    );

    // Update transaction
    const update = {};
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.note !== undefined) update.note = data.note;
    if (data.date) update.date = new Date(data.date);

    const result = await this.db.collection('transactions').findOneAndUpdate(
      { _id: objId, userId: userObjId },
      { $set: update },
      { returnDocument: 'after' }
    );

    // Apply new balance change
    const newIncrement = result.type === 'income' ? result.amount : -result.amount;
    await this.db.collection('accounts').updateOne(
      { _id: result.accountId },
      { $inc: { balance: newIncrement } }
    );

    return result;
  }

  async deleteTransaction(userId, transactionId) {
    const userObjId = toObjectId(userId.toString());
    const objId = toObjectId(transactionId);
    const transaction = await this.db.collection('transactions').findOne({
      _id: objId,
      userId: userObjId
    });

    if (!transaction) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      throw err;
    }

    // Revert balance change
    const increment = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    await this.db.collection('accounts').updateOne(
      { _id: transaction.accountId },
      { $inc: { balance: increment } }
    );

    await this.db.collection('transactions').deleteOne({ _id: objId, userId: userObjId });
    return true;
  }

  async deleteMultipleTransactions(userId, transactionIds) {
    for (const id of transactionIds) {
      try {
        await this.deleteTransaction(userId, id);
      } catch (err) {
        console.error(`Failed to delete tx ${id}:`, err);
      }
    }
    return true;
  }
}
