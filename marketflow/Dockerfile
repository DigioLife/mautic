# Multi-stage Dockerfile for MarketFlow

# Base stage
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build all apps
RUN pnpm build

# API Production stage
FROM node:20-alpine AS api
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy built API and dependencies
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]

# Worker Production stage
FROM node:20-alpine AS worker
WORKDIR /app

ENV NODE_ENV=production

# Copy built worker and dependencies
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

CMD ["node", "apps/worker/dist/worker.js"]

# Frontend Production stage (for static hosting)
FROM nginx:alpine AS web
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
