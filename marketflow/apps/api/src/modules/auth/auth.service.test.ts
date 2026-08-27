import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// vi.hoisted() runs before vi.mock()'s factory and before the imports below
// are evaluated, so `mockPrisma` is safely defined by the time auth.service.ts
// (which does `import { prisma } from '@marketflow/database'`) loads.
const mockPrisma = vi.hoisted(() => {
  const p: any = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    tenant: { findUnique: vi.fn(), create: vi.fn() },
    masterAdmin: { findUnique: vi.fn() },
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    verificationToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  };
  p.$transaction = vi.fn(async (arg: any) => (typeof arg === 'function' ? arg(p) : Promise.all(arg)));
  return p;
});

vi.mock('@marketflow/database', () => ({ prisma: mockPrisma }));

import { AuthService, RESERVED_SLUGS } from './auth.service';

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  describe('register', () => {
    it('rejects an email that is already registered (any tenant)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          tenantName: 'Acme',
          tenantSlug: 'acme',
          email: 'taken@example.com',
          password: 'password123',
          name: 'Jane',
        })
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });

      // Regression guard for the cross-tenant ambiguity bug: the lookup
      // must be a plain unique-by-email query, not scoped by tenant and
      // not a findFirst (which would silently pick an arbitrary match).
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'taken@example.com' } });
    });

    it.each([...RESERVED_SLUGS])('rejects reserved slug "%s"', async (slug) => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          tenantName: 'Acme',
          tenantSlug: slug,
          email: 'new@example.com',
          password: 'password123',
          name: 'Jane',
        })
      ).rejects.toMatchObject({ code: 'SLUG_RESERVED' });

      // Should fail before ever touching the tenant table
      expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a slug that is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing-tenant' });

      await expect(
        service.register({
          tenantName: 'Acme',
          tenantSlug: 'acme',
          email: 'new@example.com',
          password: 'password123',
          name: 'Jane',
        })
      ).rejects.toMatchObject({ code: 'SLUG_EXISTS' });
    });

    it('creates tenant + owner user on the happy path', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-1', name: 'Acme', slug: 'acme' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'new@example.com',
        name: 'Jane',
        role: 'OWNER',
      });
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.verificationToken.create.mockResolvedValue({});

      const result = await service.register({
        tenantName: 'Acme',
        tenantSlug: 'acme',
        email: 'new@example.com',
        password: 'password123',
        name: 'Jane',
      });

      expect(result.tenant.slug).toBe('acme');
      expect(result.user.role).toBe('OWNER');
      // A verification email should be queued as part of registration
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects when no user exists for the email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('looks up the user by a plain unique email query, not scoped by tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'x@example.com', password: 'y' })).rejects.toThrow();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'x@example.com' },
        include: { tenant: true },
      });
    });

    it('rejects an OAuth-only account (no password set) with a clear error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: null,
        tenant: { isActive: true },
      });

      await expect(
        service.login({ email: 'oauth@example.com', password: 'anything' })
      ).rejects.toMatchObject({ code: 'OAUTH_ACCOUNT' });
    });

    it('rejects an inactive tenant even with correct credentials', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'a@example.com',
        name: 'A',
        role: 'OWNER',
        password: hashed,
        isActive: true,
        tenant: { id: 'tenant-1', name: 'A Co', slug: 'a-co', isActive: false },
      });

      await expect(
        service.login({ email: 'a@example.com', password: 'correct-password' })
      ).rejects.toMatchObject({ code: 'TENANT_INACTIVE' });
    });

    it('succeeds with correct credentials and an active account', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'a@example.com',
        name: 'A',
        role: 'OWNER',
        password: hashed,
        isActive: true,
        tenant: { id: 'tenant-1', name: 'A Co', slug: 'a-co', isActive: true },
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login({ email: 'a@example.com', password: 'correct-password' });

      expect(result.user.email).toBe('a@example.com');
      // Non-null assertion is safe here: tenant is only null on the
      // isMasterAdmin branch, which this call doesn't take.
      expect(result.tenant!.slug).toBe('a-co');
    });

    it('rejects Master Admin login against the regular user table', async () => {
      mockPrisma.masterAdmin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'admin@example.com', password: 'x', isMasterAdmin: true })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

      // Must check masterAdmin table, never fall through to the user table
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
