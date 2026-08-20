import { PrismaClient, ApplicationStage } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.application.updateMany({
    where: { stage: ApplicationStage.SIGNUP_COMPLETED },
    data: { stage: ApplicationStage.KYC_PENDING },
  });
  console.log('✅ Updated applications to KYC_PENDING:', result.count);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
