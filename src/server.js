import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { accountsRoutes } from './routes/accounts.routes.js';
import { categoriesRoutes } from './routes/categories.routes.js';
import { transactionsRoutes } from './routes/transactions.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { setupSocket } from './socket/socket.js';

const fastify = Fastify({
  logger: false,
  trustProxy: true
});

fastify.addHook('onRequest', (request, reply, done) => {
  console.log(`➡️  [${request.method}] ${request.url}`);
  done();
});

fastify.addHook('onResponse', (request, reply, done) => {
  console.log(`⬅️  [${request.method}] ${request.url} - ${reply.statusCode}`);
  done();
});

async function start() {
  try {
    // Register plugins
    // Разрешаем: localhost (dev), любой origin в prod (для мобильного приложения)
    const allowedOrigins = [
      'http://localhost:5173',
      'capacitor://localhost',   // Capacitor Android
      'ionic://localhost',       // Ionic
      'http://localhost',        // Android WebView
    ];

    await fastify.register(cors, {
      origin: (origin, cb) => {
        // В production разрешаем всё (мобильное приложение не имеет Origin)
        if (config.nodeEnv === 'production' || !origin || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true
    });

    await fastify.register(jwt, {
      secret: config.jwtSecret
    });

    // Setup Socket.io
    const io = new Server(fastify.server, {
      cors: {
        origin: '*',  // Для мобильного приложения
        credentials: true
      }
    });

    fastify.decorate('io', io);
    setupSocket(io, fastify);

    // Connect to database
    await connectDatabase();

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(accountsRoutes, { prefix: '/api/accounts' });
    await fastify.register(categoriesRoutes, { prefix: '/api/categories' });
    await fastify.register(transactionsRoutes, { prefix: '/api/transactions' });
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
    await fastify.register(adminRoutes, { prefix: '/api/admin' });

    // Health check
    fastify.get('/health', async () => ({ status: 'ok' }));

    // Error handler
    fastify.setErrorHandler(errorHandler);

    // Start server
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${config.port}`);
  } catch (err) {
    console.error('❌ Server startup error:', err);
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
