import { CategoriesService } from '../services/categories.service.js';
import { schemas, validate } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

export async function categoriesRoutes(fastify) {
  const categoriesService = new CategoriesService();

  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const type = request.query.type;
    const categories = await categoriesService.getCategories(request.user.userId, type);
    return { categories };
  });

  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = validate(schemas.createCategory)(request.body);
    const category = await categoriesService.createCategory(request.user.userId, data);
    
    fastify.io.to(`user:${request.user.userId}`).emit('category:created', category);
    
    return { category };
  });

  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const category = await categoriesService.updateCategory(
      request.user.userId,
      request.params.id,
      request.body
    );
    
    fastify.io.to(`user:${request.user.userId}`).emit('category:updated', category);
    
    return { category };
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    await categoriesService.deleteCategory(request.user.userId, request.params.id);
    
    fastify.io.to(`user:${request.user.userId}`).emit('category:deleted', { id: request.params.id });
    
    return { success: true };
  });
}
