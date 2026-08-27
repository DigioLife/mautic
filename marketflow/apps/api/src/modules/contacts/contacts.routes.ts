import { FastifyInstance } from 'fastify';
import { ContactsController } from './contacts.controller';
import { authenticate } from '../../core/auth';

export async function contactsRoutes(server: FastifyInstance) {
  const controller = new ContactsController();

  // Every route in this module requires a signed-in tenant user
  server.addHook('preHandler', authenticate);

  server.get('/', controller.list.bind(controller));
  server.post('/', controller.create.bind(controller));
  server.get('/tags', controller.listTags.bind(controller));
  server.post('/tags', controller.createTag.bind(controller));
  server.get('/:id', controller.getById.bind(controller));
  server.put('/:id', controller.update.bind(controller));
  server.delete('/:id', controller.remove.bind(controller));
  server.post('/:id/tags', controller.addTag.bind(controller));
  server.delete('/:id/tags/:tagId', controller.removeTag.bind(controller));
}
