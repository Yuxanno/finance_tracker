import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { getDatabase } from '../config/database.js';
import { toObjectId } from '../utils/helpers.js';

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
    
    const objId = toObjectId(userId);
    
    await db.collection('users').deleteOne({ _id: objId });
    // Also delete linked data
    await db.collection('accounts').deleteMany({ userId: objId });
    await db.collection('transactions').deleteMany({ userId: objId });
    await db.collection('categories').deleteMany({ userId: objId });
    
    return { success: true };
  });

  // Promote user to admin
  fastify.post('/users/:id/promote', async (request, reply) => {
    const userId = request.params.id;
    const objId = toObjectId(userId);
    await db.collection('users').updateOne(
      { _id: objId },
      { $set: { role: 'admin' } }
    );
    return { success: true };
  });

  // Update user profile/role
  fastify.put('/users/:id', async (request, reply) => {
    const userId = request.params.id;
    const objId = toObjectId(userId);
    const data = request.body;
    
    // Using existing authService logic for updates but with admin override
    await db.collection('users').updateOne(
      { _id: objId },
      { $set: data }
    );
    
    const updated = await db.collection('users').findOne({ _id: objId }, { projection: { password: 0 } });
    return updated;
  });
}
