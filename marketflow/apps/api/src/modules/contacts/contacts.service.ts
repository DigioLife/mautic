import { prisma } from '@marketflow/database';
import { AppError } from '../../core/error-handler';

export interface ListContactsQuery {
  page?: number;
  limit?: number;
  q?: string;
  tagId?: string;
  lifecycleStage?: string;
  sortBy?: 'createdAt' | 'leadScore' | 'fullName';
  sortDir?: 'asc' | 'desc';
}

export interface UpsertContactData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  zipCode?: string;
  timezone?: string;
  leadScore?: number;
  lifecycleStage?: string;
  source?: string;
  isSubscribed?: boolean;
  doNotEmail?: boolean;
  doNotSms?: boolean;
  doNotCall?: boolean;
  customFields?: Record<string, unknown>;
}

function deriveFullName(firstName?: string | null, lastName?: string | null): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export class ContactsService {
  // List with pagination, search, and basic filters — always scoped to tenantId,
  // never trust a caller-supplied tenant filter.
  async list(tenantId: string, query: ListContactsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const where: any = { tenantId };

    if (query.q) {
      const q = query.q;
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.lifecycleStage) {
      where.lifecycleStage = query.lifecycleStage;
    }

    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(tenantId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
      include: { tags: { include: { tag: true } } },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    return contact;
  }

  // Enforces the tenant's subscription contact limit — the whole point of
  // contactLimit/contactCount on Tenant, which existed but was never wired
  // up until this module landed.
  async create(tenantId: string, data: UpsertContactData, meta: { ip?: string } = {}) {
    if (!data.email && !data.phone) {
      throw new AppError('A contact needs at least an email or a phone number', 400, 'MISSING_IDENTIFIER');
    }

    if (data.email) {
      const existing = await prisma.contact.findUnique({
        where: { tenantId_email: { tenantId, email: data.email } },
      });
      if (existing) {
        throw new AppError('A contact with this email already exists', 400, 'CONTACT_EXISTS');
      }
    }

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });

      if (tenant.contactCount >= tenant.contactLimit) {
        throw new AppError(
          `Contact limit reached (${tenant.contactLimit}). Upgrade your plan to add more contacts.`,
          403,
          'CONTACT_LIMIT_REACHED'
        );
      }

      const isSubscribed = data.isSubscribed ?? true;

      const contact = await tx.contact.create({
        data: {
          tenantId,
          email: data.email,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: deriveFullName(data.firstName, data.lastName),
          company: data.company,
          jobTitle: data.jobTitle,
          website: data.website,
          country: data.country,
          state: data.state,
          city: data.city,
          address: data.address,
          zipCode: data.zipCode,
          timezone: data.timezone,
          leadScore: data.leadScore ?? 0,
          lifecycleStage: data.lifecycleStage ?? 'lead',
          source: data.source ?? 'manual',
          isSubscribed,
          doNotEmail: data.doNotEmail ?? false,
          doNotSms: data.doNotSms ?? false,
          doNotCall: data.doNotCall ?? false,
          customFields: (data.customFields ?? {}) as any,
          // Recording consent at creation time is a GDPR requirement, not
          // just a nice-to-have — see Contact.consentGivenAt in the schema.
          ...(isSubscribed
            ? { consentGivenAt: new Date(), consentSource: 'manual', consentIp: meta.ip }
            : {}),
        },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { contactCount: { increment: 1 } },
      });

      return contact;
    });
  }

  async update(tenantId: string, id: string, data: UpsertContactData) {
    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.contact.findUnique({
        where: { tenantId_email: { tenantId, email: data.email } },
      });
      if (emailTaken) {
        throw new AppError('Another contact already uses this email', 400, 'CONTACT_EXISTS');
      }
    }

    const nextFirstName = data.firstName ?? existing.firstName;
    const nextLastName = data.lastName ?? existing.lastName;

    return prisma.contact.update({
      where: { id },
      data: {
        ...data,
        fullName: deriveFullName(nextFirstName, nextLastName),
        customFields: data.customFields !== undefined ? (data.customFields as any) : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.contact.delete({ where: { id } }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: { contactCount: { decrement: 1 } },
      }),
    ]);
  }

  // ==============================
  // Tags
  // ==============================

  async listTags(tenantId: string) {
    return prisma.tag.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createTag(tenantId: string, name: string, color?: string) {
    const existing = await prisma.tag.findUnique({ where: { tenantId_name: { tenantId, name } } });
    if (existing) {
      throw new AppError('A tag with this name already exists', 400, 'TAG_EXISTS');
    }

    return prisma.tag.create({ data: { tenantId, name, color } });
  }

  async addTagToContact(tenantId: string, contactId: string, tagId: string) {
    const [contact, tag] = await Promise.all([
      prisma.contact.findFirst({ where: { id: contactId, tenantId } }),
      prisma.tag.findFirst({ where: { id: tagId, tenantId } }),
    ]);

    if (!contact) throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    if (!tag) throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND');

    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId } },
      update: {},
      create: { contactId, tagId },
    });
  }

  async removeTagFromContact(tenantId: string, contactId: string, tagId: string) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');

    await prisma.contactTag.deleteMany({ where: { contactId, tagId } });
  }
}
