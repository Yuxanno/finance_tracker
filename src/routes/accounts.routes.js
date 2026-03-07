import { AccountsService } from '../services/accounts.service.js';
import { schemas, validate } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

export async function accountsRoutes(fastify) {
  const accountsService = new AccountsService();

  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const accounts = await accountsService.getAccounts(request.user.userId);
    return { accounts };
  });

  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.createAccount)(request.body);
    const account = await accountsService.createAccount(request.user.userId, data);
    
    // Emit socket event
    fastify.io.to(`user:${request.user.userId}`).emit('account:created', account);
    
    return { account };
  });

  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.updateAccount)(request.body);
    const account = await accountsService.updateAccount(
      request.user.userId,
      request.params.id,
      data
    );
    
    fastify.io.to(`user:${request.user.userId}`).emit('account:updated', account);
    
    return { account };
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    await accountsService.deleteAccount(request.user.userId, request.params.id);
    
    fastify.io.to(`user:${request.user.userId}`).emit('account:deleted', { id: request.params.id });
    
    return { success: true };
  });

  fastify.post('/reorder', { preHandler: authenticate }, async (request) => {
    await accountsService.reorderAccounts(request.user.userId, request.body.accountIds);
    return { success: true };
  });
}
