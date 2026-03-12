import { AuthService } from '../services/auth.service.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { getDatabase } from '../config/database.js';

export async function adminRoutes(fastify) {
  const authService = new AuthService();
  const db = getDatabase();

  // Middleware for all admin routes
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorizeAdmin);

  // Get statistics
  fastify.get('/stats', async (request, reply) => {
    const userCount = await db.collection('users').countDocuments();
    const transactionCount = await db.collection('transactions').countDocuments();
    const accountCount = await db.collection('accounts').countDocuments();
    
    // Last 5 users
    const latestUsers = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return {
      userCount,
      transactionCount,
      accountCount,
      latestUsers
    };
  });

  // Manage users
  fastify.get('/users', async (request) => {
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return users;
  });

  // Delete user (extreme admin action)
  fastify.delete('/users/:id', async (request, reply) => {
    const userId = request.params.id;
    // Don't delete self
    if (userId === request.user.userId) {
      return reply.code(400).send({ error: 'Cannot delete yourself' });
    }
    
    await db.collection('users').deleteOne({ _id: userId });
    // Also delete linked data
    await db.collection('accounts').deleteMany({ userId });
    await db.collection('transactions').deleteMany({ userId });
    await db.collection('categories').deleteMany({ userId });
    
    return { success: true };
  });

  // Promote user to admin
  fastify.post('/users/:id/promote', async (request, reply) => {
    const userId = request.params.id;
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { role: 'admin' } }
    );
    return { success: true };
  });
}
