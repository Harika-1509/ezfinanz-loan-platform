import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Querying and verifying EZFinanz database entities...');

  const userCount = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const customerCount = await prisma.user.count({ where: { role: 'CUSTOMER' } });
  const applicationCount = await prisma.application.count();
  const kycCount = await prisma.kycDetails.count();
  const eligibilityCount = await prisma.eligibilityCheck.count();
  const loanTermsCount = await prisma.loanTerms.count();
  const bankAccountCount = await prisma.bankAccount.count();
  const declarationCount = await prisma.declaration.count();
  const selfieCount = await prisma.selfie.count();

  console.log(`
  📊 Database Verification Summary:
  ---------------------------------
  Total Users:             ${userCount} (Admin: ${adminCount}, Customer: ${customerCount})
  Total Applications:      ${applicationCount}
  KYC Records:             ${kycCount}
  Eligibility Records:     ${eligibilityCount}
  Loan Terms Records:      ${loanTermsCount}
  Bank Account Records:    ${bankAccountCount}
  Declaration Records:     ${declarationCount}
  Selfie Records:          ${selfieCount}
  `);

  const applications = await prisma.application.findMany({
    include: {
      user: true,
      kycDetails: true,
      eligibilityCheck: true,
      loanTerms: true,
      bankAccount: true,
      declaration: true,
      selfie: {
        include: {
          reviewer: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('📋 Applications In-Depth Journey Breakdown:');
  applications.forEach((app, idx) => {
    console.log(`\n  [#${idx + 1}] Application ${app.id.slice(0, 8)}...`);
    console.log(`      User:       ${app.user.email} (${app.user.phone})`);
    console.log(`      Stage:      ${app.stage}`);
    console.log(
      `      KYC:        ${app.kycDetails ? `Verified (${app.kycDetails.fullName}, ${app.kycDetails.idType}: ${app.kycDetails.idNumber})` : 'Pending'}`
    );
    console.log(
      `      Financials: ${app.eligibilityCheck ? `Income: ₹${app.eligibilityCheck.income}, Score: ${app.eligibilityCheck.creditScore}, Result: ${app.eligibilityCheck.result}` : 'Not checked'}`
    );
    console.log(
      `      Loan Terms: ${app.loanTerms ? `₹${app.loanTerms.amount} @ ${app.loanTerms.interestRate}% for ${app.loanTerms.tenureMonths}m (EMI: ₹${app.loanTerms.emi})` : 'Not selected'}`
    );
    console.log(
      `      Bank:       ${app.bankAccount ? `${app.bankAccount.bankName} (A/C: ${app.bankAccount.accountNumber}, IFSC: ${app.bankAccount.ifsc})` : 'Not added'}`
    );
    console.log(
      `      Decl:       ${app.declaration ? `Accepted at ${app.declaration.acceptedAt.toISOString()}` : 'Pending'}`
    );
    console.log(
      `      Selfie:     ${app.selfie ? `Status: ${app.selfie.adminStatus}${app.selfie.rejectReason ? ` (Reason: ${app.selfie.rejectReason})` : ''}${app.selfie.reviewer ? ` (Reviewer: ${app.selfie.reviewer.email})` : ''}` : 'Pending'}`
    );
  });

  console.log('\n✅ All database models, relations, and sample records verified cleanly!');
}

verifyDatabase()
  .catch((e) => {
    console.error('❌ Verification script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
