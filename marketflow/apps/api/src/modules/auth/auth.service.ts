import bcrypt from 'bcryptjs';
import { prisma, User, MasterAdmin } from '@marketflow/database';
import { AppError } from '../../core/error-handler';
import { nanoid } from 'nanoid';

export interface RegisterData {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
  isMasterAdmin?: boolean;
}

export interface GoogleAuthData {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface TelegramAuthData {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export class AuthService {
  // Register new tenant with owner user
  async register(data: RegisterData) {
    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Check if slug is taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
    });

    if (existingTenant) {
      throw new AppError('Business slug already taken', 400, 'SLUG_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create tenant and owner user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenantName,
          slug: data.tenantSlug,
          email: data.email,
          subscriptionTier: 'starter',
          contactLimit: 500,
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          enabledFeatures: JSON.stringify(['email']),
        },
      });

      // Create owner user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: 'OWNER',
          authProvider: 'EMAIL',
          emailVerified: false,
        },
      });

      return { tenant, user };
    });

    return result;
  }

  // Email/Password Login
  async login(data: LoginData) {
    // Master Admin Login
    if (data.isMasterAdmin) {
      const admin = await prisma.masterAdmin.findUnique({
        where: { email: data.email },
      });

      if (!admin) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const isValidPassword = await bcrypt.compare(data.password, admin.password);

      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      return {
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: 'MASTER_ADMIN',
          isMasterAdmin: true,
        },
        tenant: null,
      };
    }

    // Regular User Login
    const user = await prisma.user.findFirst({
      where: { email: data.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.password) {
      throw new AppError('Please login with your social account', 400, 'OAUTH_ACCOUNT');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    if (!user.tenant.isActive) {
      throw new AppError('Business account is inactive', 403, 'TENANT_INACTIVE');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    };
  }

  // Google OAuth Login/Register
  async googleAuth(data: GoogleAuthData, tenantSlug?: string) {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { googleId: data.googleId },
      include: { tenant: true },
    });

    if (user) {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        user: {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
        isNewUser: false,
      };
    }

    // New user - check if registering with tenant
    if (!tenantSlug) {
      throw new AppError('Tenant slug required for new registration', 400, 'TENANT_REQUIRED');
    }

    // Create new tenant and user
    const slug = tenantSlug || `business-${nanoid(10)}`;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name + "'s Business",
          slug,
          email: data.email,
          subscriptionTier: 'starter',
          contactLimit: 500,
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          enabledFeatures: JSON.stringify(['email']),
        },
      });

      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          name: data.name,
          avatar: data.avatar,
          role: 'OWNER',
          authProvider: 'GOOGLE',
          googleId: data.googleId,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      return { tenant, user: newUser };
    });

    return {
      user: {
        id: result.user.id,
        tenantId: result.user.tenantId,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      isNewUser: true,
    };
  }

  // Telegram Auth Login/Register
  async telegramAuth(data: TelegramAuthData, tenantSlug?: string) {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { telegramId: data.telegramId },
      include: { tenant: true },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        user: {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
        isNewUser: false,
      };
    }

    // New user
    if (!tenantSlug) {
      throw new AppError('Tenant slug required for new registration', 400, 'TENANT_REQUIRED');
    }

    const name = `${data.firstName} ${data.lastName || ''}`.trim();
    const email = data.username ? `${data.username}@telegram.user` : `${data.telegramId}@telegram.user`;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: name + "'s Business",
          slug: tenantSlug,
          email,
          subscriptionTier: 'starter',
          contactLimit: 500,
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          enabledFeatures: JSON.stringify(['email']),
        },
      });

      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name,
          avatar: data.photoUrl,
          role: 'OWNER',
          authProvider: 'TELEGRAM',
          telegramId: data.telegramId,
          emailVerified: false,
          lastLoginAt: new Date(),
        },
      });

      return { tenant, user: newUser };
    });

    return {
      user: {
        id: result.user.id,
        tenantId: result.user.tenantId,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      isNewUser: true,
    };
  }

  // Create refresh token
  async createRefreshToken(userId: string) {
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  // Verify refresh token
  async verifyRefreshToken(token: string) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: { tenant: true },
        },
      },
    });

    if (!refreshToken) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    if (refreshToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
    }

    return refreshToken.user;
  }

  // Revoke refresh token
  async revokeRefreshToken(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
}
