import { PrismaClient, Role, ApplicationStage, IdType, EligibilityResult } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Setting up real Admin and Customer demo accounts in DB...');

  // 1. Admin: Harika
  const harikaPasswordHash = await bcrypt.hash('Harika@2005', 10);
  const harikaAdmin = await prisma.user.upsert({
    where: { email: 'amujuriharika649@gmail.com' },
    update: {
      passwordHash: harikaPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'amujuriharika649@gmail.com',
      phone: '+919876500001',
      passwordHash: harikaPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });
  console.log('✅ Admin 1 ready:', harikaAdmin.email);

  // 2. Admin: System default
  const adminPasswordHash = await bcrypt.hash('AdminPassword@123', 10);
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@ezfinanz.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'admin@ezfinanz.com',
      phone: '+919876543210',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });
  console.log('✅ Admin 2 ready:', systemAdmin.email);

  // 3. Customer: borrower@example.com
  const borrowerPasswordHash = await bcrypt.hash('Password@123', 10);
  const borrower = await prisma.user.upsert({
    where: { email: 'borrower@example.com' },
    update: {
      passwordHash: borrowerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'borrower@example.com',
      phone: '+919876500002',
      passwordHash: borrowerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Ensure borrower has an active application
  const existingBorrowerApp = await prisma.application.findFirst({
    where: { userId: borrower.id },
  });
  if (!existingBorrowerApp) {
    await prisma.application.create({
      data: {
        userId: borrower.id,
        stage: ApplicationStage.KYC_PENDING,
      },
    });
  }
  console.log('✅ Borrower ready:', borrower.email);

  // 4. Customer: customer@ezfinanz.com
  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@ezfinanz.com' },
    update: {
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'customer@ezfinanz.com',
      phone: '+919876500003',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const existingCustApp = await prisma.application.findFirst({
    where: { userId: customer.id },
  });
  if (!existingCustApp) {
    await prisma.application.create({
      data: {
        userId: customer.id,
        stage: ApplicationStage.KYC_PENDING,
      },
    });
  }
  console.log('✅ Customer ready:', customer.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
