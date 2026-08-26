import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { logger } from './core/logger';
import { errorHandler } from './core/error-handler';
import { validateEnv } from './core/env';
import { registerRoutes } from './routes';

// Load environment variables
dotenv.config();

// Fail fast on insecure/missing config before anything else boots
validateEnv();

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create Fastify instance
const server = Fastify({
  logger: false, // We use Winston
  bodyLimit: 10485760, // 10MB
  trustProxy: true,
});

async function start() {
  try {
    // Register plugins
    await server.register(helmet, {
      contentSecurityPolicy: false, // Adjust for your needs
    });

    // Supports a comma-separated list so previews (Lovable) + production can coexist
    const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    await server.register(cors, {
      origin: corsOrigins,
      credentials: true,
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });

    await server.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    });

    await server.register(multipart, {
      limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
      },
    });

    await server.register(websocket);

    // Add custom error handler
    server.setErrorHandler(errorHandler);

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register all routes
    await registerRoutes(server);

    // Start server
    await server.listen({ port: PORT, host: HOST });

    logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 MarketFlow API Server Started                        ║
║                                                            ║
║   📡 URL: http://${HOST}:${PORT}                             ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   📊 Health Check: http://${HOST}:${PORT}/health            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing server...`);
    await server.close();
    process.exit(0);
  });
});

// Start the server
start();
