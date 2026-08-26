import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Master Admin
  const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL || 'admin@marketflow.com';
  const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD || 'ChangeMeInProduction123!';

  const hashedPassword = await bcrypt.hash(masterAdminPassword, 10);

  const masterAdmin = await prisma.masterAdmin.upsert({
    where: { email: masterAdminEmail },
    update: {},
    create: {
      email: masterAdminEmail,
      password: hashedPassword,
      name: 'Master Administrator',
    },
  });

  console.log('✅ Master Admin created:', masterAdminEmail);

  // Create Demo Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Business',
      slug: 'demo',
      email: 'demo@marketflow.com',
      subscriptionTier: 'growth',
      contactLimit: 3000,
      subscriptionStatus: 'active',
      enabledFeatures: JSON.stringify(['email', 'sms', 'telegram', 'viber', 'chat']),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Demo Tenant created:', demoTenant.slug);

  // Create Demo User (Owner)
  const demoUserPassword = await bcrypt.hash('Demo123!', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'owner@demo.com',
      password: demoUserPassword,
      name: 'Demo Owner',
      role: 'OWNER',
      emailVerified: true,
    },
  });

  console.log('✅ Demo User created: owner@demo.com / Demo123!');

  // Create Sample Contacts
  const sampleContacts = [
    {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      company: 'Acme Inc',
      jobTitle: 'Marketing Manager',
      leadScore: 85,
      lifecycleStage: 'mql',
    },
    {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      company: 'TechCorp',
      jobTitle: 'CEO',
      leadScore: 95,
      lifecycleStage: 'sql',
    },
    {
      email: 'bob.wilson@example.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      fullName: 'Bob Wilson',
      company: 'StartupXYZ',
      jobTitle: 'Founder',
      leadScore: 60,
      lifecycleStage: 'lead',
    },
  ];

  for (const contact of sampleContacts) {
    await prisma.contact.upsert({
      where: {
        tenantId_email: {
          tenantId: demoTenant.id,
          email: contact.email,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...contact,
      },
    });
  }

  console.log('✅ Sample contacts created');

  // Create Sample Tags
  const sampleTags = [
    { name: 'Customer', color: '#10B981' },
    { name: 'Lead', color: '#3B82F6' },
    { name: 'Hot', color: '#EF4444' },
    { name: 'Cold', color: '#6B7280' },
  ];

  for (const tag of sampleTags) {
    await prisma.tag.upsert({
      where: {
        tenantId_name: {
          tenantId: demoTenant.id,
          name: tag.name,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...tag,
      },
    });
  }

  console.log('✅ Sample tags created');

  // Create Sample Email Template
  await prisma.emailTemplate.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Welcome Email',
      subject: 'Welcome to {company.name}!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to MarketFlow!</h1>
          </div>
          <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">Hi {contact.firstName},</p>
            <p style="font-size: 16px;">We're thrilled to have you on board! 🎉</p>
            <p style="font-size: 16px;">Get started by exploring our platform and see how we can help you grow your business.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{cta.url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Get Started</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Need help? Reply to this email or visit our <a href="#" style="color: #667eea;">Help Center</a>.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
            <p>&copy; 2024 MarketFlow. All rights reserved.</p>
            <p><a href="{unsubscribe.url}" style="color: #9ca3af;">Unsubscribe</a></p>
          </div>
        </body>
        </html>
      `,
      category: 'Welcome',
    },
  });

  console.log('✅ Sample email template created');

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📧 Master Admin: ', masterAdminEmail);
  console.log('🔑 Password:     ', masterAdminPassword);
  console.log('═══════════════════════════════════════════════════');
  console.log('📧 Demo User:    owner@demo.com');
  console.log('🔑 Password:     Demo123!');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
