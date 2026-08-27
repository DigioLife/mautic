import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => {
  const p: any = {
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenant: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    contactTag: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  p.$transaction = vi.fn(async (arg: any) => (typeof arg === 'function' ? arg(p) : Promise.all(arg)));
  return p;
});

vi.mock('@marketflow/database', () => ({ prisma: mockPrisma }));

import { ContactsService } from './contacts.service';

const TENANT_ID = 'tenant-1';

describe('ContactsService', () => {
  let service: ContactsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContactsService();
  });

  describe('create', () => {
    it('rejects a contact with neither email nor phone', async () => {
      await expect(service.create(TENANT_ID, {})).rejects.toMatchObject({
        code: 'MISSING_IDENTIFIER',
      });
      expect(mockPrisma.tenant.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email within the same tenant', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(TENANT_ID, { email: 'dupe@example.com' })
      ).rejects.toMatchObject({ code: 'CONTACT_EXISTS' });

      expect(mockPrisma.contact.findUnique).toHaveBeenCalledWith({
        where: { tenantId_email: { tenantId: TENANT_ID, email: 'dupe@example.com' } },
      });
    });

    it('enforces the tenant contact limit', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: TENANT_ID,
        contactCount: 500,
        contactLimit: 500,
      });

      await expect(
        service.create(TENANT_ID, { email: 'new@example.com' })
      ).rejects.toMatchObject({ code: 'CONTACT_LIMIT_REACHED' });

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it('creates the contact and increments tenant.contactCount when under the limit', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: TENANT_ID,
        contactCount: 10,
        contactLimit: 500,
      });
      mockPrisma.contact.create.mockResolvedValue({ id: 'contact-1', email: 'new@example.com' });
      mockPrisma.tenant.update.mockResolvedValue({});

      const result = await service.create(
        TENANT_ID,
        { email: 'new@example.com', firstName: 'Ada', lastName: 'Lovelace' },
        { ip: '1.2.3.4' }
      );

      expect(result.id).toBe('contact-1');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { contactCount: { increment: 1 } },
      });

      const createArgs = mockPrisma.contact.create.mock.calls[0][0];
      expect(createArgs.data.fullName).toBe('Ada Lovelace');
      // isSubscribed defaults true, so consent should be recorded automatically
      expect(createArgs.data.consentGivenAt).toBeInstanceOf(Date);
      expect(createArgs.data.consentIp).toBe('1.2.3.4');
    });

    it('does not record consent for a contact created as unsubscribed', async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: TENANT_ID,
        contactCount: 10,
        contactLimit: 500,
      });
      mockPrisma.contact.create.mockResolvedValue({ id: 'contact-2' });

      await service.create(TENANT_ID, { email: 'x@example.com', isSubscribed: false });

      const createArgs = mockPrisma.contact.create.mock.calls[0][0];
      expect(createArgs.data.consentGivenAt).toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws not-found for a contact belonging to a different tenant', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'contact-in-other-tenant', { firstName: 'X' })
      ).rejects.toMatchObject({ code: 'CONTACT_NOT_FOUND' });

      // Scoped lookup must include tenantId, not just the contact id
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: 'contact-in-other-tenant', tenantId: TENANT_ID },
      });
    });

    it('rejects changing email to one already used by another contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1', email: 'old@example.com' });
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c2' });

      await expect(
        service.update(TENANT_ID, 'c1', { email: 'taken@example.com' })
      ).rejects.toMatchObject({ code: 'CONTACT_EXISTS' });
    });

    it('recomputes fullName from the merged first/last name', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c1',
        email: 'a@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
      mockPrisma.contact.update.mockResolvedValue({ id: 'c1' });

      await service.update(TENANT_ID, 'c1', { lastName: 'King' });

      const updateArgs = mockPrisma.contact.update.mock.calls[0][0];
      expect(updateArgs.data.fullName).toBe('Ada King');
    });
  });

  describe('delete', () => {
    it('decrements tenant.contactCount on delete', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });

      await service.delete(TENANT_ID, 'c1');

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { contactCount: { decrement: 1 } },
      });
    });

    it('throws not-found rather than decrementing for a nonexistent contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'ghost')).rejects.toMatchObject({
        code: 'CONTACT_NOT_FOUND',
      });
      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('always scopes the query to the given tenantId', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.list(TENANT_ID, {});

      const findManyArgs = mockPrisma.contact.findMany.mock.calls[0][0];
      expect(findManyArgs.where.tenantId).toBe(TENANT_ID);
    });

    it('clamps limit to a maximum of 100', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const result = await service.list(TENANT_ID, { limit: 5000 });

      expect(result.pagination.limit).toBe(100);
    });
  });
});
