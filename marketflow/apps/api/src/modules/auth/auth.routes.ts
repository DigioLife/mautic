import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/auth';

export async function authRoutes(server: FastifyInstance) {
  const controller = new AuthController();

  // Public routes
  server.post('/register', controller.register.bind(controller));
  server.post('/login', controller.login.bind(controller));
  server.post('/refresh', controller.refresh.bind(controller));
  server.post('/logout', controller.logout.bind(controller));

  // OAuth routes
  server.get('/google', controller.googleCallback.bind(controller));
  server.get('/google/callback', controller.googleCallback.bind(controller));
  server.post('/telegram', controller.telegramCallback.bind(controller));

  // Protected routes
  server.get('/me', {
    preHandler: authenticate,
    handler: controller.me.bind(controller),
  });
}
