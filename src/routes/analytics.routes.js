import { AnalyticsService } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.js';

export async function analyticsRoutes(fastify) {
  const analyticsService = new AnalyticsService();

  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { period = 'month', accountId, type = 'expense' } = request.query;
    
    const analytics = await analyticsService.getAnalytics(
      request.user.userId,
      period,
      accountId,
      type
    );
    
    return analytics;
  });

  fastify.get('/dashboard', { preHandler: authenticate }, async (request) => {
    const stats = await analyticsService.getDashboardStats(
      request.user.userId,
      request.query.accountId
    );
    
    return stats;
  });
}
