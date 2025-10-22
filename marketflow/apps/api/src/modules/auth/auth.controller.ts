import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AppError } from '../../core/error-handler';

const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  isMasterAdmin: z.boolean().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  // POST /api/auth/register
  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);

    const { tenant, user } = await authService.register(data);

    // Generate JWT
    const accessToken = request.server.jwt.sign({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Generate refresh token
    const refreshToken = await authService.createRefreshToken(user.id);

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        accessToken,
        refreshToken,
      },
    });
  }

  // POST /api/auth/login
  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);

    const { user, tenant } = await authService.login(data);

    // Generate JWT
    const accessToken = request.server.jwt.sign({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      isMasterAdmin: user.isMasterAdmin,
    });

    // Generate refresh token
    const refreshToken = await authService.createRefreshToken(user.id);

    return reply.send({
      success: true,
      data: {
        user,
        tenant,
        accessToken,
        refreshToken,
      },
    });
  }

  // POST /api/auth/refresh
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshTokenSchema.parse(request.body);

    const user = await authService.verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = request.server.jwt.sign({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
      },
    });
  }

  // POST /api/auth/logout
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshTokenSchema.parse(request.body);

    await authService.revokeRefreshToken(refreshToken);

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  }

  // GET /api/auth/me
  async me(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      success: true,
      data: {
        user: request.user,
        tenant: request.tenant,
      },
    });
  }

  // TODO: Implement Google OAuth callback
  async googleCallback(request: FastifyRequest, reply: FastifyReply) {
    // This will be implemented with Passport.js Google Strategy
    throw new AppError('Not implemented yet', 501);
  }

  // TODO: Implement Telegram auth callback
  async telegramCallback(request: FastifyRequest, reply: FastifyReply) {
    // This will be implemented with Telegram auth verification
    throw new AppError('Not implemented yet', 501);
  }
}
