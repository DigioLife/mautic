# 🚀 MarketFlow

**Modern Marketing Automation Platform** - Built for small businesses

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

---

## ✨ Features

### 📧 Multi-Channel Communication
- **Email Marketing** - Resend, SendGrid, Mailgun, AWS SES support
- **SMS Campaigns** - Twilio integration
- **Telegram Bots** - Native bot support
- **Viber Business** - Viber messaging integration
- **Live Chat** - Real-time customer support

### 🤖 Marketing Automation
- **Visual Campaign Builder** - Drag-and-drop workflow automation
- **Dynamic Segmentation** - Smart contact lists
- **Behavioral Triggers** - Website activity-based campaigns
- **A/B Testing** - Optimize email performance
- **Lead Scoring** - Prioritize hot leads

### 📊 Analytics & Reporting
- **Real-time Dashboard** - Live campaign metrics
- **Contact Timeline** - Complete interaction history
- **Revenue Tracking** - ROI measurement
- **Custom Reports** - Export to CSV/Excel

### 🎨 Content Creation
- **Email Builder** - Visual email template designer
- **Landing Pages** - High-converting page builder
- **Form Builder** - Embeddable forms
- **Dynamic Content** - Personalized messages

### 👥 Contact Management
- **Unlimited Contacts** - Based on subscription tier
- **Custom Fields** - Flexible data structure
- **Tags & Segments** - Advanced organization
- **Import/Export** - Bulk operations

### 🔒 Enterprise Features
- **Multi-Tenancy** - Isolated workspaces
- **Team Management** - Role-based access control
- **API Access** - RESTful API + Webhooks
- **GDPR Compliant** - Privacy-first tracking

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + TypeScript
- **Vite** - Lightning-fast dev
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Beautiful components
- **React Query** - Server state management
- **Zustand** - Client state
- **React Flow** - Visual workflow builder

### Backend
- **Node.js 20** + TypeScript
- **Fastify** - High-performance API
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Relational database
- **Redis** - Cache + Queue
- **BullMQ** - Background jobs
- **Socket.io** - WebSockets

### Infrastructure
- **Docker** - Containerization
- **Turbo** - Monorepo tooling
- **pnpm** - Fast package manager

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/marketflow.git
cd marketflow

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start PostgreSQL & Redis (Docker)
docker-compose up -d postgres redis

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database (creates master admin)
pnpm db:seed

# Start development servers
pnpm dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **WebSocket**: ws://localhost:4001

---

## 📁 Project Structure

```
marketflow/
├── apps/
│   ├── web/                 # Frontend (React + Vite)
│   ├── api/                 # Backend API (Fastify)
│   ├── worker/              # Background jobs
│   └── tracking/            # Tracking script
├── packages/
│   ├── database/            # Prisma schema
│   ├── shared/              # Shared utilities
│   └── ui/                  # UI components
├── docker-compose.yml       # Local development
├── Dockerfile              # Production build
└── turbo.json              # Monorepo config
```

---

## 🔐 Default Credentials

**Master Admin**
- Email: `admin@marketflow.com`
- Password: `ChangeMeInProduction123!`

> ⚠️ **IMPORTANT**: Change these credentials immediately in production!

---

## 📚 Documentation

- [Installation Guide](./docs/installation.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guide](./docs/contributing.md)

---

## 🎯 Pricing Tiers

| Tier | Contacts | Price |
|------|----------|-------|
| Starter | 500 | $29/mo |
| Basic | 1,000 | $49/mo |
| Growth | 3,000 | $99/mo |
| Pro | 10,000 | $199/mo |
| Business | 25,000 | $399/mo |
| Enterprise | 50,000 | $699/mo |
| Ultimate | 100,000 | $1,299/mo |

*Additional contacts available as paid addon*

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [Fastify](https://www.fastify.io/)
- [React](https://react.dev/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)

---

## 📧 Support

- **Email**: support@marketflow.com
- **Documentation**: https://docs.marketflow.com
- **Discord**: https://discord.gg/marketflow

---

Made with 💜 by the MarketFlow team
