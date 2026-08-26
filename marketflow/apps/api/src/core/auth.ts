import { FastifyRequest } from 'fastify';
import { prisma } from '@marketflow/database';
import { AppError } from './error-handler';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  isMasterAdmin?: boolean;
}

interface JwtPayload {
  id: string;
  tenantId?: string;
  email: string;
  name: string;
  role: string;
  isMasterAdmin?: boolean;
}

// Extend Fastify Request with our resolved, DB-verified app user. Deliberately
// NOT named `user` — @fastify/jwt already declares FastifyRequest.user (the
// raw decoded JWT payload) and redeclaring it with a different type here
// causes a TS interface-merge conflict. `authUser` is the enriched, fresh
// object built after verifying the token and reloading from the database.
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
    tenant?: {
      id: string;
      name: string;
      slug: string;
      subscriptionTier: string;
      contactLimit: number;
      contactCount: number;
    };
  }
}

// JWT Authentication Middleware
export async function authenticate(request: FastifyRequest) {
  let decoded: JwtPayload;
  try {
    decoded = await request.jwtVerify<JwtPayload>();
  } catch (error) {
    // Only token verification failures (missing/expired/malformed) collapse to this
    throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
  }

  // Check if master admin
  if (decoded.isMasterAdmin) {
    request.authUser = {
      id: decoded.id,
      tenantId: '',
      email: decoded.email,
      name: decoded.name,
      role: 'MASTER_ADMIN',
      isMasterAdmin: true,
    };
    return;
  }

  // Regular user - fetch from database
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: {
      tenant: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
  }

  if (!user.tenant.isActive) {
    throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
  }

  request.authUser = {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  request.tenant = {
    id: user.tenant.id,
    name: user.tenant.name,
    slug: user.tenant.slug,
    subscriptionTier: user.tenant.subscriptionTier,
    contactLimit: user.tenant.contactLimit,
    contactCount: user.tenant.contactCount,
  };
}

// Master Admin Only Middleware
export async function requireMasterAdmin(request: FastifyRequest) {
  await authenticate(request);

  if (!request.authUser?.isMasterAdmin) {
    throw new AppError('Master admin access required', 403, 'FORBIDDEN');
  }
}

// Role-based access control
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest) => {
    await authenticate(request);

    if (!request.authUser) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(request.authUser.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
  };
}

// Tenant isolation - ensures queries are scoped to tenant
export function getTenantId(request: FastifyRequest): string {
  if (!request.authUser?.tenantId) {
    throw new AppError('Tenant context required', 400, 'MISSING_TENANT');
  }
  return request.authUser.tenantId;
}
