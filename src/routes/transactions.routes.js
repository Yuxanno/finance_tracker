import { TransactionsService } from '../services/transactions.service.js';
import { schemas, validate } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

export async function transactionsRoutes(fastify) {
  const transactionsService = new TransactionsService();

  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const filters = {
      accountId: request.query.accountId,
      type: request.query.type,
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      search: request.query.search,
      categoryId: request.query.categoryId,
      limit: request.query.limit ? parseInt(request.query.limit) : 100
    };

    const transactions = await transactionsService.getTransactions(request.user.userId, filters);
    return { transactions };
  });

  fastify.get('/today', { preHandler: authenticate }, async (request) => {
    const transactions = await transactionsService.getTodayTransactions(
      request.user.userId,
      request.query.accountId
    );
    return { transactions };
  });

  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.createTransaction)(request.body);
    const transaction = await transactionsService.createTransaction(request.user.userId, data);

    fastify.io.to(`user:${request.user.userId}`).emit('transaction:created', transaction);

    return { transaction };
  });

  fastify.post('/bulk-delete', { preHandler: authenticate }, async (request) => {
    // We expect request.body.transactionIds to be an array
    const { transactionIds } = request.body;
    if (!Array.isArray(transactionIds)) {
      throw new Error('transactionIds must be an array');
    }
    await transactionsService.deleteMultipleTransactions(request.user.userId, transactionIds);

    // We can emit a single bulk deleted event or multiple individual events
    // Assuming frontend will just invalidate queries, emit a simple refresh event
    fastify.io.to(`user:${request.user.userId}`).emit('transactions:updated');

    return { success: true };
  });

  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const transaction = await transactionsService.updateTransaction(
      request.user.userId,
      request.params.id,
      request.body
    );

    fastify.io.to(`user:${request.user.userId}`).emit('transaction:updated', transaction);

    return { transaction };
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    await transactionsService.deleteTransaction(request.user.userId, request.params.id);

    fastify.io.to(`user:${request.user.userId}`).emit('transaction:deleted', { id: request.params.id });

    return { success: true };
  });
}
