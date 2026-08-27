import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ContactsService } from './contacts.service';
import { getTenantId } from '../../core/auth';

const contactsService = new ContactsService();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().min(1).optional(),
  tagId: z.string().optional(),
  lifecycleStage: z.string().optional(),
  sortBy: z.enum(['createdAt', 'leadScore', 'fullName']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

const contactBodySchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    company: z.string().max(150).optional(),
    jobTitle: z.string().max(150).optional(),
    website: z.string().url().optional(),
    country: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    address: z.string().max(255).optional(),
    zipCode: z.string().max(20).optional(),
    timezone: z.string().max(100).optional(),
    leadScore: z.number().int().min(0).max(100).optional(),
    lifecycleStage: z.enum(['lead', 'mql', 'sql', 'customer', 'evangelist']).optional(),
    source: z.string().max(100).optional(),
    isSubscribed: z.boolean().optional(),
    doNotEmail: z.boolean().optional(),
    doNotSms: z.boolean().optional(),
    doNotCall: z.boolean().optional(),
    customFields: z.record(z.unknown()).optional(),
  })
  .strict();

const createContactSchema = contactBodySchema;
const updateContactSchema = contactBodySchema.partial();

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });
const tagParamSchema = z.object({ id: z.string().min(1), tagId: z.string().min(1) });
const addTagSchema = z.object({ tagId: z.string().min(1) });

export class ContactsController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const query = listQuerySchema.parse(request.query);

    const result = await contactsService.list(tenantId, query);
    return reply.send({ success: true, ...result });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    const contact = await contactsService.getById(tenantId, id);
    return reply.send({ success: true, data: contact });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const data = createContactSchema.parse(request.body);

    const contact = await contactsService.create(tenantId, data, { ip: request.ip });
    return reply.status(201).send({ success: true, data: contact });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);
    const data = updateContactSchema.parse(request.body);

    const contact = await contactsService.update(tenantId, id, data);
    return reply.send({ success: true, data: contact });
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);

    await contactsService.delete(tenantId, id);
    return reply.send({ success: true, message: 'Contact deleted' });
  }

  // Tags
  async listTags(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const tags = await contactsService.listTags(tenantId);
    return reply.send({ success: true, data: tags });
  }

  async createTag(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { name, color } = createTagSchema.parse(request.body);

    const tag = await contactsService.createTag(tenantId, name, color);
    return reply.status(201).send({ success: true, data: tag });
  }

  async addTag(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { id } = idParamSchema.parse(request.params);
    const { tagId } = addTagSchema.parse(request.body);

    await contactsService.addTagToContact(tenantId, id, tagId);
    return reply.send({ success: true, message: 'Tag added' });
  }

  async removeTag(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = getTenantId(request);
    const { id, tagId } = tagParamSchema.parse(request.params);

    await contactsService.removeTagFromContact(tenantId, id, tagId);
    return reply.send({ success: true, message: 'Tag removed' });
  }
}
