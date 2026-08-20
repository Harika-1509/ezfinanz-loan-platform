import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning fake test accounts from database...');

  // 1. Delete all fake/demo users and their cascading data
  const fakeEmails = [
    'borrower@example.com',
    'customer@ezfinanz.com',
    'admin@ezfinanz.com',
    'aarav.sharma@example.com',
    'priya.patel@example.com',
    'rajesh.iyer@example.com',
    'ananya.verma@example.com',
    'vikram.malhotra@example.com',
  ];

  const fakeUsers = await prisma.user.findMany({
    where: { email: { in: fakeEmails } },
    select: { id: true, email: true },
  });

  const fakeUserIds = fakeUsers.map((u) => u.id);

  if (fakeUserIds.length > 0) {
    const apps = await prisma.application.findMany({
      where: { userId: { in: fakeUserIds } },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);

    if (appIds.length > 0) {
      await prisma.selfie.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.declaration.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.bankAccount.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.loanTerms.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.eligibilityCheck.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.kycDetails.deleteMany({ where: { applicationId: { in: appIds } } });
      await prisma.application.deleteMany({ where: { id: { in: appIds } } });
    }

    await prisma.refreshToken.deleteMany({ where: { userId: { in: fakeUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: fakeUserIds } } });
    console.log(`✅ Deleted ${fakeUserIds.length} fake demo accounts.`);
  }

  // 2. Ensure amujuriharika649@gmail.com is present as the sole Administrator
  const harikaPasswordHash = await bcrypt.hash('Harika@2005', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'amujuriharika649@gmail.com' },
    update: {
      passwordHash: harikaPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'amujuriharika649@gmail.com',
      phone: '+919876543210',
      passwordHash: harikaPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log(`👑 Active Admin Account: ${admin.email} (Role: ${admin.role})`);

  // List all remaining users
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, emailVerified: true },
  });
  console.log('📋 Current Users in DB:');
  allUsers.forEach((u) => console.log(`   - ${u.email} (${u.role})`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
