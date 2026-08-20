import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@EZFinanz2026!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ezfinanz.com' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      email: 'admin@ezfinanz.com',
      phone: '+919876543210',
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log('✅ Real System Admin successfully ready:', admin.email, 'Role:', admin.role);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
