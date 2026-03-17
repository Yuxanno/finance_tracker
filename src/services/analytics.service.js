import { getDatabase } from '../config/database.js';
import { toObjectId, getDateRange } from '../utils/helpers.js';

export class AnalyticsService {
  constructor() {
    this.db = getDatabase();
  }

  async getAnalytics(userId, period = 'month', accountId = null, type = 'expense') {
    const { start, end } = getDateRange(period);
    const userObjId = toObjectId(userId.toString());

    const matchStage = {
      userId: userObjId,
      type,
      date: { $gte: start, $lte: end }
    };

    if (accountId) {
      matchStage.accountId = toObjectId(accountId);
    }

    // Aggregate by category
    const categoryStats = await this.db.collection('transactions').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          categoryId: '$_id',
          categoryName: '$category.name',
          categoryIcon: '$category.icon',
          categoryColor: '$category.color',
          total: 1,
          count: 1
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    // Calculate total
    const totalAmount = categoryStats.reduce((sum, cat) => sum + cat.total, 0);

    // Add percentage
    const withPercentage = categoryStats.map(cat => ({
      ...cat,
      percentage: totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0
    }));

    // Get period comparison
    const previousPeriod = this.getPreviousPeriod(start, period);
    const previousTotal = await this.getTotalForPeriod(
      userId,
      previousPeriod.start,
      previousPeriod.end,
      type,
      accountId
    );

    const change = previousTotal > 0
      ? ((totalAmount - previousTotal) / previousTotal) * 100
      : 0;

    return {
      period,
      type,
      total: totalAmount,
      categories: withPercentage,
      comparison: {
        previousTotal,
        change: Math.round(change * 10) / 10
      }
    };
  }

  async getDashboardStats(userId, accountId = null) {
    const userObjId = toObjectId(userId.toString());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseMatch = { userId: userObjId };
    if (accountId) {
      baseMatch.accountId = toObjectId(accountId);
    }

    // Today's stats
    const todayStats = await this.db.collection('transactions').aggregate([
      { $match: { ...baseMatch, date: { $gte: today } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const income = todayStats.find(s => s._id === 'income')?.total || 0;
    const expense = todayStats.find(s => s._id === 'expense')?.total || 0;

    // Month stats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStats = await this.db.collection('transactions').aggregate([
      { $match: { ...baseMatch, date: { $gte: monthStart } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const monthIncome = monthStats.find(s => s._id === 'income')?.total || 0;
    const monthExpense = monthStats.find(s => s._id === 'expense')?.total || 0;

    return {
      today: {
        income,
        expense,
        balance: income - expense
      },
      month: {
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense
      }
    };
  }

  async getTotalForPeriod(userId, start, end, type, accountId = null) {
    const matchStage = {
      userId,
      type,
      date: { $gte: start, $lte: end }
    };

    if (accountId) {
      matchStage.accountId = toObjectId(accountId);
    }

    const result = await this.db.collection('transactions').aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    return result[0]?.total || 0;
  }

  getPreviousPeriod(start, period) {
    const prevStart = new Date(start);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);

    switch (period) {
      case 'day':
        prevStart.setDate(prevStart.getDate() - 1);
        break;
      case 'week':
        prevStart.setDate(prevStart.getDate() - 7);
        break;
      case 'month':
        prevStart.setMonth(prevStart.getMonth() - 1);
        break;
      case '6months':
        prevStart.setMonth(prevStart.getMonth() - 6);
        break;
      case 'year':
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        break;
    }

    return { start: prevStart, end: prevEnd };
  }
}
