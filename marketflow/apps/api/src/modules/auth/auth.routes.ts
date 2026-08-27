import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { authenticate } from '../../core/auth';

// Tighter than the global default — these endpoints are brute-force targets
const strictAuthRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '15 minutes',
    },
  },
};

export async function authRoutes(server: FastifyInstance) {
  const controller = new AuthController();

  // Public routes
  server.post('/register', strictAuthRateLimit, controller.register.bind(controller));
  server.post('/login', strictAuthRateLimit, controller.login.bind(controller));
  server.post('/refresh', controller.refresh.bind(controller));
  server.post('/logout', controller.logout.bind(controller));

  // Email verification
  server.post('/verify-email', controller.verifyEmail.bind(controller));
  server.post('/resend-verification', strictAuthRateLimit, controller.resendVerification.bind(controller));

  // Password reset — same brute-force/enumeration exposure as login
  server.post('/forgot-password', strictAuthRateLimit, controller.forgotPassword.bind(controller));
  server.post('/reset-password', strictAuthRateLimit, controller.resetPassword.bind(controller));

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
