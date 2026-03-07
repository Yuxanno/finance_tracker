import { AuthService } from '../services/auth.service.js';
import { schemas, validate } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(fastify) {
  const authService = new AuthService();

  fastify.post('/register', async (request, reply) => {
    const data = validate(schemas.register)(request.body);
    const user = await authService.register(data);
    const token = fastify.jwt.sign({ userId: user._id });

    return { user, token };
  });

  fastify.post('/login', async (request, reply) => {
    const data = validate(schemas.login)(request.body);
    const user = await authService.login(data.login, data.password);
    const token = fastify.jwt.sign({ userId: user._id });

    return { user, token };
  });

  fastify.get('/me', { preHandler: authenticate }, async (request) => {
    const user = await authService.getUserById(request.user.userId);
    return { user };
  });

  fastify.put('/profile', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.updateProfile)(request.body);
    const user = await authService.updateProfile(request.user.userId, data);
    return { user };
  });

  fastify.post('/change-password', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.changePassword)(request.body);
    await authService.changePassword(
      request.user.userId,
      data.currentPassword,
      data.newPassword
    );
    return { success: true };
  });
  fastify.post('/seed-categories', { preHandler: authenticate }, async (request) => {
    const user = await authService.getUserById(request.user.userId);
    const count = await authService.seedDefaultCategories(request.user.userId, user.language);
    return { success: true, created: count };
  });
}
