import { AuthService } from '../services/auth.service.js';

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
    
    // Background update of lastSeen to not block the request
    const authService = new AuthService();
    authService.updateLastSeen(request.user.userId).catch(err => {
      console.error('Failed to update lastSeen:', err);
    });
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function authorizeAdmin(request, reply) {
  try {
    const authService = new AuthService();
    const user = await authService.getUserById(request.user.userId);
    if (!user || user.role !== 'admin') {
      reply.code(403).send({ error: 'Forbidden: Admin access only' });
      return;
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
