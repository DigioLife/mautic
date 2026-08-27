import { FastifyInstance } from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes';
import { contactsRoutes } from '../modules/contacts/contacts.routes';

export async function registerRoutes(server: FastifyInstance) {
  // API v1 prefix
  server.register(async (apiV1) => {
    // Auth routes
    apiV1.register(authRoutes, { prefix: '/auth' });

    // Contacts (includes tags)
    apiV1.register(contactsRoutes, { prefix: '/contacts' });

    // TODO: Add more module routes
    // apiV1.register(emailRoutes, { prefix: '/emails' });
    // apiV1.register(campaignRoutes, { prefix: '/campaigns' });
    // etc.

  }, { prefix: '/api' });
}
