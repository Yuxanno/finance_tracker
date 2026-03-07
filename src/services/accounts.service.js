import { getDatabase } from '../config/database.js';
import { toObjectId } from '../utils/helpers.js';

export class AccountsService {
  constructor() {
    this.db = getDatabase();
  }

  async getAccounts(userId) {
    const userObjId = toObjectId(userId.toString());
    const accounts = await this.db.collection('accounts')
      .find({ userId: userObjId })
      .sort({ order: 1 })
      .toArray();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const aggregatedStats = await this.db.collection('transactions').aggregate([
      { $match: { userId: userObjId, date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: { accountId: '$accountId', type: '$type' },
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const statsMap = {};
    aggregatedStats.forEach(stat => {
      const acctIdStr = stat._id.accountId.toString();
      if (!statsMap[acctIdStr]) statsMap[acctIdStr] = { income: 0, expense: 0 };
      statsMap[acctIdStr][stat._id.type] = stat.total;
    });

    return accounts.map(a => ({
      ...a,
      monthlyIncome: statsMap[a._id.toString()]?.income || 0,
      monthlyExpense: statsMap[a._id.toString()]?.expense || 0,
    }));
  }

  async createAccount(userId, data) {
    const userObjId = toObjectId(userId.toString());
    const count = await this.db.collection('accounts').countDocuments({ userId: userObjId });

    const account = {
      userId: userObjId,
      name: data.name,
      balance: data.balance || 0,
      color: data.color || '#6366f1',
      icon: data.icon || '💳',
      order: count,
      createdAt: new Date()
    };

    const result = await this.db.collection('accounts').insertOne(account);
    return { ...account, _id: result.insertedId };
  }

  async updateAccount(userId, accountId, data) {
    const userObjId = toObjectId(userId.toString());
    const update = {};
    if (data.name) update.name = data.name;
    if (data.color) update.color = data.color;
    if (data.icon) update.icon = data.icon;

    const result = await this.db.collection('accounts').findOneAndUpdate(
      { _id: toObjectId(accountId), userId: userObjId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      const err = new Error('Account not found');
      err.statusCode = 404;
      throw err;
    }

    return result;
  }

  async deleteAccount(userId, accountId) {
    const objId = toObjectId(accountId);
    const userObjId = toObjectId(userId.toString());

    // Check if account has transactions
    const hasTransactions = await this.db.collection('transactions')
      .countDocuments({ accountId: objId, userId: userObjId });

    if (hasTransactions > 0) {
      const err = new Error('Cannot delete account with transactions');
      err.statusCode = 400;
      throw err;
    }

    const result = await this.db.collection('accounts').deleteOne({
      _id: objId,
      userId: userObjId
    });

    if (result.deletedCount === 0) {
      const err = new Error('Account not found');
      err.statusCode = 404;
      throw err;
    }

    return true;
  }

  async reorderAccounts(userId, accountIds) {
    const userObjId = toObjectId(userId.toString());
    const operations = accountIds.map((id, index) => ({
      updateOne: {
        filter: { _id: toObjectId(id), userId: userObjId },
        update: { $set: { order: index } }
      }
    }));

    await this.db.collection('accounts').bulkWrite(operations);
    return true;
  }

  async updateBalance(userId, accountId, amount, type) {
    const userObjId = toObjectId(userId.toString());
    const increment = type === 'income' ? amount : -amount;

    await this.db.collection('accounts').updateOne(
      { _id: toObjectId(accountId), userId: userObjId },
      { $inc: { balance: increment } }
    );
  }
}
