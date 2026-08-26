import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AppError } from '../../core/error-handler';
import { verifyTelegramWidgetData } from './telegram-verify';

const authService = new AuthService();

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

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

    const { user, refreshToken: newRefreshToken } = await authService.rotateRefreshToken(refreshToken);

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
        refreshToken: newRefreshToken,
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
        user: request.authUser,
        tenant: request.tenant,
      },
    });
  }

  // TODO: Implement Google OAuth callback (Passport.js Google Strategy)
  async googleCallback(_request: FastifyRequest, _reply: FastifyReply) {
    throw new AppError('Not implemented yet', 501);
  }

  // POST /api/auth/telegram — body is the Telegram Login Widget's onauth payload
  // plus an optional tenantSlug (required only for first-time signup)
  async telegramCallback(request: FastifyRequest, reply: FastifyReply) {
    const { tenantSlug, ...widgetData } = telegramAuthSchema.parse(request.body);

    verifyTelegramWidgetData(widgetData);

    const { user, tenant, isNewUser } = await authService.telegramAuth(
      {
        telegramId: String(widgetData.id),
        firstName: widgetData.first_name,
        lastName: widgetData.last_name,
        username: widgetData.username,
        photoUrl: widgetData.photo_url,
      },
      tenantSlug
    );

    const accessToken = request.server.jwt.sign({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await authService.createRefreshToken(user.id);

    return reply.status(isNewUser ? 201 : 200).send({
      success: true,
      data: { user, tenant, accessToken, refreshToken, isNewUser },
    });
  }
}
