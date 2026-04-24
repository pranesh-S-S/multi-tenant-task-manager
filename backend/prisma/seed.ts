import { PrismaClient, Role, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (dev only)
  await prisma.activityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  // ========================================
  // Organization 1: Acme Corp
  // ========================================
  const acme = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Admin',
      role: Role.ADMIN,
      organizationId: acme.id,
    },
  });

  const acmeMember1 = await prisma.user.create({
    data: {
      email: 'john@acme.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.MEMBER,
      organizationId: acme.id,
    },
  });

  const acmeMember2 = await prisma.user.create({
    data: {
      email: 'jane@acme.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: Role.MEMBER,
      organizationId: acme.id,
    },
  });

  // Acme tasks
  for (const t of [
    {
      title: 'Setup CI/CD Pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      organizationId: acme.id,
      createdById: acmeAdmin.id,
      assigneeIds: [acmeMember1.id],
    },
    {
      title: 'Design Landing Page',
      description: 'Create a modern landing page with hero section and CTA',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      organizationId: acme.id,
      createdById: acmeAdmin.id,
      assigneeIds: [acmeMember2.id],
    },
    {
      title: 'Write API Documentation',
      description: 'Document all REST endpoints with request/response examples',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      organizationId: acme.id,
      createdById: acmeMember1.id,
      assigneeIds: [acmeMember1.id],
    },
    {
      title: 'Fix Login Bug',
      description: 'Users unable to login after password reset',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.URGENT,
      organizationId: acme.id,
      createdById: acmeMember2.id,
      assigneeIds: [],
    },
    {
      title: 'Archived Feature Spec',
      description: 'Old feature specification - soft deleted for audit',
      status: TaskStatus.CANCELLED,
      priority: TaskPriority.LOW,
      organizationId: acme.id,
      createdById: acmeAdmin.id,
      assigneeIds: [],
      isDeleted: true,
      deletedAt: new Date(),
    },
  ]) {
    const { assigneeIds, ...taskData } = t;
    await prisma.task.create({
      data: {
        ...taskData,
        assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
      },
    });
  }

  // ========================================
  // Organization 2: Globex Inc
  // ========================================
  const globex = await prisma.organization.create({
    data: {
      name: 'Globex Inc',
      slug: 'globex-inc',
    },
  });

  const globexAdmin = await prisma.user.create({
    data: {
      email: 'admin@globex.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Boss',
      role: Role.ADMIN,
      organizationId: globex.id,
    },
  });

  const globexMember = await prisma.user.create({
    data: {
      email: 'bob@globex.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Builder',
      role: Role.MEMBER,
      organizationId: globex.id,
    },
  });

  // Globex tasks
  for (const t of [
    {
      title: 'Market Research Q2',
      description: 'Analyze competitor pricing and features',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      organizationId: globex.id,
      createdById: globexAdmin.id,
      assigneeIds: [globexMember.id],
    },
    {
      title: 'Update Privacy Policy',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      organizationId: globex.id,
      createdById: globexMember.id,
      assigneeIds: [globexMember.id],
    },
    {
      title: 'Quarterly Report',
      description: 'Compile Q1 performance metrics',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      organizationId: globex.id,
      createdById: globexAdmin.id,
      assigneeIds: [],
    },
  ]) {
    const { assigneeIds, ...taskData } = t;
    await prisma.task.create({
      data: {
        ...taskData,
        assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   📦 Organizations: 2 (Acme Corp, Globex Inc)`);
  console.log(`   👤 Users: 5 (3 Acme, 2 Globex)`);
  console.log(`   📋 Tasks: 8 (5 Acme, 3 Globex, 1 soft-deleted)`);
  console.log('');
  console.log('   🔑 All passwords: password123');
  console.log('   🔐 Admin: admin@acme.com / admin@globex.com');
  console.log('   👥 Members: john@acme.com / jane@acme.com / bob@globex.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
