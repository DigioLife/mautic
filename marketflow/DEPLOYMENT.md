# 🚀 MarketFlow Deployment Guide

This guide will help you deploy MarketFlow to production.

---

## 📋 Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 16
- Redis 7
- Docker (optional but recommended)

---

## 🐳 Docker Deployment (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/marketflow.git
cd marketflow
```

### 2. Configure environment variables

```bash
cp .env.example .env
nano .env
```

**Important variables to configure:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- Email provider credentials (Resend, SendGrid, etc.)
- SMS provider (Twilio)
- Pabbly API keys

### 3. Start infrastructure services

```bash
docker-compose up -d postgres redis
```

### 4. Run database migrations

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Build and start the application

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

---

## ☁️ Cloud Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set build command: `cd apps/web && pnpm build`
3. Set output directory: `apps/web/dist`
4. Add environment variable: `VITE_API_URL=https://your-api-domain.com/api`

### Railway (Backend API)

1. Connect your GitHub repository
2. Create new service from `apps/api`
3. Add PostgreSQL and Redis plugins
4. Set environment variables from `.env.example`
5. Deploy command: `cd apps/api && pnpm build && pnpm start`

### Render (Alternative)

1. Create new Web Service
2. Build command: `pnpm install && pnpm build`
3. Start command: `cd apps/api && node dist/server.js`
4. Add PostgreSQL and Redis services

---

## 🔧 Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2
npm install -g pm2
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/yourusername/marketflow.git
cd marketflow

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
nano .env

# Setup database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Build application
pnpm build
```

### 3. Start with PM2

```bash
# Start API
pm2 start apps/api/dist/server.js --name marketflow-api

# Start Worker
pm2 start apps/worker/dist/worker.js --name marketflow-worker

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Configure Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/marketflow/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔐 Security Checklist

- [ ] Change default Master Admin credentials
- [ ] Set strong JWT secrets
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure log rotation
- [ ] Enable Redis password
- [ ] Review and set proper environment variables

---

## 📊 Monitoring

### Application Logs

```bash
# PM2 logs
pm2 logs

# Application logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Health Checks

- API Health: `https://yourdomain.com/api/health`
- Database: Check PostgreSQL connection
- Redis: Check Redis connection

---

## 🔄 Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Build
pnpm build

# Restart services
pm2 restart all
```

---

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U marketflow -d marketflow -h localhost
```

### Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping
```

### Application Won't Start

```bash
# Check logs
pm2 logs marketflow-api

# Check port availability
sudo lsof -i :4000
```

---

## 📞 Support

- Documentation: https://docs.marketflow.com
- Issues: https://github.com/yourusername/marketflow/issues
- Email: support@marketflow.com

---

Made with 💜 by the MarketFlow team
