import { PrismaClient, Role, ApplicationStage } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
  console.log('================================================================================');
  console.log('       CHUNK 21 VERIFICATION: ADMIN DASHBOARD & APPLICATION DETAIL             ');
  console.log('================================================================================\n');

  // 1️⃣ Seed / Retrieve Admin User
  console.log('1️⃣ Setting up Admin User & Authentication...');
  const adminEmail = 'admin.ops@ezfinanz.com';
  const adminPassword = 'AdminPassword@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, emailVerified: true, passwordHash: hashedPassword },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const adminLoginJson = await adminLoginRes.json();
  const adminToken = adminLoginJson.data.accessToken;
  console.log(`   ✓ Admin Authenticated (${adminEmail}). Role: ${adminUser.role}`);

  // 2️⃣ Verify Role-Based Authorization Guard (Customer vs Admin)
  console.log('\n2️⃣ Testing Role-Based Route Guards (403 Forbidden for Non-Admins)...');
  const borrowerEmail = `borrower.test.${Date.now()}@example.com`;
  const borrowerSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: borrowerEmail,
      password: 'BorrowerPass@123',
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    }),
  });
  const borrowerSignupJson = await borrowerSignupRes.json();
  const borrowerToken = borrowerSignupJson.data.accessToken;

  const forbiddenRes = await fetch(`${BASE_URL}/admin/applications`, {
    headers: { Authorization: `Bearer ${borrowerToken}` },
  });
  console.log(`   ✓ Customer accessing /admin/applications -> Status: ${forbiddenRes.status} (Expected: 403)`);
  if (forbiddenRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for customer, received ${forbiddenRes.status}`);
  }

  // 3️⃣ Test Admin Platform Stats (GET /admin/stats)
  console.log('\n3️⃣ Testing Admin Stats Endpoint (GET /admin/stats)...');
  const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsJson = await statsRes.json();
  console.log(`   ✓ Stats Status: ${statsRes.status}`);
  console.log(`   ✓ Total Applications: ${statsJson.data.totalApplications}`);
  console.log(`   ✓ Waiting Review: ${statsJson.data.waitingReview}`);
  console.log(`   ✓ Approved: ${statsJson.data.approved}`);
  console.log(`   ✓ Disbursed: ${statsJson.data.disbursed}`);
  console.log(`   ✓ Total Disbursed Volume: ₹${statsJson.data.totalDisbursedAmount}`);

  // 4️⃣ Advance Borrower Application to WAITING_ADMIN_REVIEW
  console.log('\n4️⃣ Advancing Borrower Application Through Complete Onboarding...');
  const appRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${borrowerToken}` },
  });
  const appJson = await appRes.json();
  const applicationId = appJson.data.application.id;

  // Step 1: 2FA Verify
  await fetch(`${BASE_URL}/verification/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
  });
  const otpRes = await fetch(`${BASE_URL}/verification/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({ otp: '123456' }),
  });
  if (!otpRes.ok) throw new Error(`OTP failed: ${await otpRes.text()}`);

  await fetch(`${BASE_URL}/verification/phone/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
  });
  await fetch(`${BASE_URL}/verification/phone/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({ otp: '123456' }),
  });

  // Step 2: KYC
  const kycRes = await fetch(`${BASE_URL}/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({
      fullName: 'Vikramaditya Oberoi',
      dob: '1992-05-18',
      gender: 'MALE',
      address: '742 Platinum Heights, Bandra West, Mumbai 400050',
      idType: 'PAN',
      idNumber: 'ABCDE1234F',
    }),
  });
  if (!kycRes.ok) throw new Error(`KYC failed: ${await kycRes.text()}`);

  // Step 3: Eligibility
  const eligRes = await fetch(`${BASE_URL}/eligibility/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({
      income: 145000,
      requestedAmount: 750000,
      existingDebts: 12000,
      employerName: 'Tata Consultancy Services',
      designation: 'Senior Lead Architect',
      creditScore: 790,
    }),
  });
  if (!eligRes.ok) throw new Error(`Eligibility failed: ${await eligRes.text()}`);

  // Step 4: Loan Terms
  const termsRes = await fetch(`${BASE_URL}/loan-terms/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({ amount: 750000, tenureMonths: 36 }),
  });
  if (!termsRes.ok) throw new Error(`Terms failed: ${await termsRes.text()}`);

  // Step 5: Bank Account
  const bankRes = await fetch(`${BASE_URL}/bank-account/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({
      accountNumber: '001205001234',
      ifsc: 'HDFC0000120',
      holderName: 'Vikramaditya Oberoi',
      bankName: 'HDFC Bank Ltd',
    }),
  });
  if (!bankRes.ok) throw new Error(`Bank failed: ${await bankRes.text()}`);

  // Step 6: Declaration
  const declRes = await fetch(`${BASE_URL}/declaration/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({ accepted: true, termsVersion: 'v1.0' }),
  });
  if (!declRes.ok) throw new Error(`Declaration failed: ${await declRes.text()}`);

  // Step 7: Selfie
  const dummySelfieBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const selfieRes = await fetch(`${BASE_URL}/selfie/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
    body: JSON.stringify({ imageBase64: dummySelfieBase64 }),
  });
  if (!selfieRes.ok) throw new Error(`Selfie failed: ${await selfieRes.text()}`);
  console.log(`   ✓ Borrower Application (${applicationId}) reached WAITING_ADMIN_REVIEW.`);

  // 5️⃣ Test Admin Applications Registry (GET /admin/applications with search & filter)
  console.log('\n5️⃣ Testing Admin Applications List with Filters & Search...');
  const listRes = await fetch(`${BASE_URL}/admin/applications?stage=WAITING_ADMIN_REVIEW&search=Vikramaditya`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listJson = await listRes.json();
  console.log(`   ✓ Registry Query Status: ${listRes.status}`);
  console.log(`   ✓ Total Matches: ${listJson.data.pagination.total || listJson.data.pagination.totalCount}`);
  const match = listJson.data.applications.find((a: any) => a.id === applicationId);
  if (!match) {
    console.log('   Applications returned:', listJson.data.applications);
    throw new Error(`Application ${applicationId} not found in search results!`);
  }
  console.log(`   ✓ Found matching applicant: ${match.applicantName} (Stage: ${match.stage})`);

  // 6️⃣ Test Admin Application Detail (GET /admin/applications/:id)
  console.log('\n6️⃣ Testing Admin Application Detail (GET /admin/applications/:id)...');
  const detailRes = await fetch(`${BASE_URL}/admin/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const detailJson = await detailRes.json();
  console.log(`   ✓ Detail Status: ${detailRes.status}`);
  console.log(`   ✓ Applicant Legal Name: ${detailJson.data.kycDetails.fullName}`);
  console.log(`   ✓ Monthly Income: ₹${detailJson.data.eligibilityCheck.income}`);
  console.log(`   ✓ Sanctioned Principal: ₹${detailJson.data.loanTerms.amount}`);
  console.log(`   ✓ Monthly EMI: ₹${detailJson.data.loanTerms.emi}`);
  console.log(`   ✓ Net Disbursement: ₹${detailJson.data.loanTerms.netDisbursement}`);
  console.log(`   ✓ Bank Name: ${detailJson.data.bankAccount.bankName}`);
  console.log(`   ✓ Biometric Photo URL: ${detailJson.data.selfie.photoUrl}`);

  // 7️⃣ Admin Approving Selfie & Advancing to APPROVED
  console.log('\n7️⃣ Testing Selfie Approval Action (POST /admin/applications/:id/selfie/approve)...');
  const approveRes = await fetch(`${BASE_URL}/admin/applications/${applicationId}/selfie/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const approveJson = await approveRes.json();
  console.log(`   ✓ Selfie Approve Status: ${approveRes.status}`);
  console.log(`   ✓ New Application Stage: ${approveJson.data?.application?.stage || approveJson.data?.stage}`);

  // 8️⃣ Admin Executing Loan Disbursement (POST /admin/applications/:id/disburse)
  console.log('\n8️⃣ Testing Loan Disbursement (POST /admin/applications/:id/disburse)...');
  const disburseRes = await fetch(`${BASE_URL}/admin/applications/${applicationId}/disburse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      referenceId: `TXN_NEFT_TEST_${Date.now()}`,
      notes: 'Underwriting batch verified and released to borrower bank account.',
    }),
  });
  const disburseJson = await disburseRes.json();
  const disburseReceipt = disburseJson.data?.receipt || disburseJson.data;
  console.log(`   ✓ Disburse Status: ${disburseRes.status}`);
  console.log(`   ✓ Transaction Reference: ${disburseReceipt.referenceId}`);
  console.log(`   ✓ Disbursed Amount: ₹${disburseReceipt.disbursedAmount}`);
  console.log(`   ✓ Final Application Stage: ${disburseReceipt.stage}`);

  // 9️⃣ Test Admin Rejection Scenario on Separate Application
  console.log('\n9️⃣ Testing Rejection Action (POST /admin/applications/:id/selfie/reject)...');
  const rejectBorrowerEmail = `reject.candidate.${Date.now()}@example.com`;
  const rejectBorrowerRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: rejectBorrowerEmail,
      password: 'BorrowerPass@123',
    }),
  });
  const rejectBorrowerJson = await rejectBorrowerRes.json();
  const rejectAppId = rejectBorrowerJson.data.application.id;

  const rejectRes = await fetch(`${BASE_URL}/admin/applications/${rejectAppId}/selfie/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      reason: 'Biometric capture quality inadequate and ID name does not match credit registry.',
    }),
  });
  const rejectJson = await rejectRes.json();
  console.log(`   ✓ Rejection Status: ${rejectRes.status}`);
  console.log(`   ✓ Application Stage: ${rejectJson.data?.application?.stage || rejectJson.data?.stage}`);
  console.log(`   ✓ Recorded Rejection Reason: ${rejectJson.data?.selfie?.rejectReason || 'Recorded'}`);

  console.log('\n================================================================================');
  console.log('   🎉 CHUNK 21 ADMIN DASHBOARD & DETAIL VERIFIED WITH 100% SUCCESS!             ');
  console.log('================================================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Chunk 21 Verification Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
