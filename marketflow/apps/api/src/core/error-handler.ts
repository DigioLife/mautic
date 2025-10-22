import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  logger.error('Request error:', {
    method: request.method,
    url: request.url,
    error: error.message,
    stack: error.stack,
  });

  // Handle specific error types
  if (error.name === 'AppError') {
    const appError = error as AppError;
    return reply.status(appError.statusCode).send({
      success: false,
      error: {
        message: appError.message,
        code: appError.code,
      },
    });
  }

  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message,
      },
    });
  }

  // JWT errors
  if (error.message.includes('jwt')) {
    return reply.status(401).send({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      },
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      message: statusCode === 500 ? 'Internal server error' : error.message,
      code: 'SERVER_ERROR',
    },
  });
}
