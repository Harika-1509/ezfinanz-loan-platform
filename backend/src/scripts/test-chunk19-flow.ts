import { calculateLoanTerms } from '../modules/loan-terms/loan-terms.calculator';

const API_BASE = 'http://localhost:5000/api/v1';

async function runChunk19FlowTest() {
  console.log('================================================================================');
  console.log('       CHUNK 19 END-TO-END VERIFICATION: BANK + DECLARATION + SELFIE FLOW       ');
  console.log('================================================================================\n');

  const timestamp = Date.now();
  const testEmail = `borrower_chunk19_${timestamp}@testfinanz.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password@123';

  let accessToken = '';
  let applicationId = '';

  // 1. Signup
  console.log('1️⃣ Registering new borrower...');
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    }),
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok || !signupData.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  }
  accessToken = signupData.data.accessToken;
  applicationId = signupData.data.application.id;
  console.log(`   ✓ Signup successful. User ID: ${signupData.data.user.id}, App ID: ${applicationId}`);

  // 2. Dual Verification (Email & Phone)
  console.log('2️⃣ Verifying Email & Phone 2FA...');
  await fetch(`${API_BASE}/verification/email/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  const verifyEmailRes = await fetch(`${API_BASE}/verification/email/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });
  if (!verifyEmailRes.ok) throw new Error(`Email verification failed: ${await verifyEmailRes.text()}`);

  await fetch(`${API_BASE}/verification/phone/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  const verifyPhoneRes = await fetch(`${API_BASE}/verification/phone/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });
  const verifyPhoneData = await verifyPhoneRes.json();
  console.log(`   ✓ Dual verification completed. Stage: ${verifyPhoneData.data.applicationStage}`);

  // 3. KYC Submission
  console.log('3️⃣ Submitting KYC Details...');
  const kycRes = await fetch(`${API_BASE}/kyc/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Vikram Aditya Singhania',
      dob: '1992-05-15',
      gender: 'MALE',
      address: '402, Highline Residency, Bandra West, Mumbai 400050',
      idType: 'PAN',
      idNumber: 'ABCPS1234A',
    }),
  });
  const kycData = await kycRes.json();
  if (!kycRes.ok || !kycData.success) throw new Error(`KYC failed: ${JSON.stringify(kycData)}`);
  console.log(`   ✓ KYC submitted. Stage: ${kycData.data.application.stage}`);

  // 4. Eligibility Check
  console.log('4️⃣ Assessing Credit & Underwriting Eligibility...');
  const eligRes = await fetch(`${API_BASE}/eligibility/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      income: 120000,
      requestedAmount: 500000,
      existingDebts: 10000,
      employerName: 'Tata Consultancy Services',
      designation: 'Lead Solution Architect',
      creditScore: 780,
    }),
  });
  const eligData = await eligRes.json();
  if (!eligRes.ok || !eligData.success) throw new Error(`Eligibility failed: ${JSON.stringify(eligData)}`);
  console.log(`   ✓ Eligibility check passed: ${eligData.data.calculation.result}. Max Eligible: ₹${eligData.data.calculation.maxEligibleAmount}`);

  // 5. Loan Terms Confirmation
  console.log('5️⃣ Selecting & Confirming Loan Terms (₹4,00,000 @ 24 Months)...');
  const termsRes = await fetch(`${API_BASE}/loan-terms/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 400000,
      tenureMonths: 24,
    }),
  });
  const termsData = await termsRes.json();
  if (!termsRes.ok || !termsData.success) throw new Error(`Loan terms failed: ${JSON.stringify(termsData)}`);
  console.log(`   ✓ Loan terms locked. Monthly EMI: ₹${termsData.data.loanTerms.emi}, Net Disb: ₹${termsData.data.loanTerms.netDisbursement}`);
  console.log(`   ✓ Stage advanced to: ${termsData.data.application.stage}`);

  // 6. Bank Account Linking (Chunk 19)
  console.log('6️⃣ Linking Disbursement Bank Account (Chunk 19)...');
  const bankRes = await fetch(`${API_BASE}/bank-account/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holderName: 'Vikram Aditya Singhania',
      accountNumber: '91827364554433',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd - Bandra West',
    }),
  });
  const bankData = await bankRes.json();
  if (!bankRes.ok || !bankData.success) throw new Error(`Bank account linking failed: ${JSON.stringify(bankData)}`);
  console.log(`   ✓ Bank account linked: ${bankData.data.bankAccount.bankName} (A/C ending in ${bankData.data.bankAccount.accountNumber.slice(-4)})`);
  console.log(`   ✓ Stage advanced to: ${bankData.data.application.stage}`);

  // 7. Declaration Text & Acceptance (Chunk 19)
  console.log('7️⃣ Retrieving Declaration Text & Confirming Electronic Consent (Chunk 19)...');
  const declTextRes = await fetch(`${API_BASE}/declaration/text`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const declTextData = await declTextRes.json();
  if (!declTextRes.ok || !declTextData.success) throw new Error(`Declaration text fetch failed: ${JSON.stringify(declTextData)}`);
  console.log(`   ✓ Retrieved ${declTextData.data.clauses.length} legal clauses for borrower: ${declTextData.data.applicantName}`);

  const declAcceptRes = await fetch(`${API_BASE}/declaration/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accepted: true,
      termsVersion: declTextData.data.termsVersion || 'v1.0',
    }),
  });
  const declAcceptData = await declAcceptRes.json();
  if (!declAcceptRes.ok || !declAcceptData.success) throw new Error(`Declaration acceptance failed: ${JSON.stringify(declAcceptData)}`);
  console.log(`   ✓ Declaration accepted with e-consent timestamp: ${declAcceptData.data.declaration.acceptedAt}`);
  console.log(`   ✓ Stage advanced to: ${declAcceptData.data.application.stage}`);

  // 8. Selfie Verification Submission (Chunk 19)
  console.log('8️⃣ Submitting Biometric Verification Selfie (Chunk 19)...');
  // 1x1 transparent PNG Base64 sample for automated integration testing
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const selfieRes = await fetch(`${API_BASE}/selfie/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data: dummyBase64,
    }),
  });
  const selfieData = await selfieRes.json();
  if (!selfieRes.ok || !selfieData.success) throw new Error(`Selfie submission failed: ${JSON.stringify(selfieData)}`);
  console.log(`   ✓ Selfie stored successfully. Photo URL: ${selfieData.data.selfie.photoUrl}`);
  console.log(`   ✓ Stage advanced to: ${selfieData.data.application.stage}`);

  // 9. Verify Selfie Status (Chunk 19)
  console.log('9️⃣ Querying Selfie Status Endpoint...');
  const selfieStatusRes = await fetch(`${API_BASE}/selfie/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const selfieStatusData = await selfieStatusRes.json();
  if (!selfieStatusRes.ok || !selfieStatusData.success) throw new Error('Selfie status fetch failed');
  console.log(`   ✓ Selfie status retrieved. Admin Status: ${selfieStatusData.data.selfie.adminStatus}`);

  // 10. Admin Login & Approval
  console.log('🔟 Admin Login & Selfie Review Approval...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@ezfinanz.com',
      password: 'AdminPassword@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.success) throw new Error('Admin login failed');
  const adminToken = adminLoginData.data.accessToken;

  const approveRes = await fetch(`${API_BASE}/admin/applications/${applicationId}/selfie/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  });
  const approveData = await approveRes.json();
  if (!approveRes.ok || !approveData.success) throw new Error(`Admin approval failed: ${JSON.stringify(approveData)}`);
  console.log(`   ✓ Admin approved application # ${applicationId}. Stage: ${approveData.data.application.stage}`);

  // 11. Admin Disbursement Confirmation
  console.log('1️⃣1️⃣ Admin Loan Disbursement Confirmation...');
  const disburseRes = await fetch(`${API_BASE}/admin/applications/${applicationId}/disburse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  });
  const disburseData = await disburseRes.json();
  if (!disburseRes.ok || !disburseData.success) throw new Error(`Disbursement failed: ${JSON.stringify(disburseData)}`);
  console.log(`   ✓ Loan Disbursed! Disbursed Amount: ₹${disburseData.data.disbursedAmount.toLocaleString('en-IN')}`);
  console.log(`   ✓ Final Lifecycle Stage: ${disburseData.data.stage}`);

  console.log('\n================================================================================');
  console.log('   🎉 CHUNK 19 END-TO-END VERIFICATION COMPLETED WITH 100% SUCCESS!   ');
  console.log('================================================================================\n');
}

runChunk19FlowTest().catch((err) => {
  console.error('❌ Chunk 19 Flow Test Failed:', err);
  process.exit(1);
});
