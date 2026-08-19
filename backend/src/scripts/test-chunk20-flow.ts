/**
 * ==============================================================================
 * CHUNK 20 VERIFICATION SCRIPT: CUSTOMER STATUS DASHBOARD & OUTCOME SCENARIOS
 * Tests customer dashboard data retrieval, full 6-step summary payloads, and all
 * lifecycle outcome states: WAITING_ADMIN_REVIEW, APPROVED, DISBURSED, and REJECTED.
 * ==============================================================================
 */

const API_BASE = 'http://localhost:5000/api/v1';

async function runChunk20Verification() {
  console.log('================================================================================');
  console.log('       CHUNK 20 VERIFICATION: CUSTOMER DASHBOARD & OUTCOME STATES       ');
  console.log('================================================================================\n');

  const ts = Date.now();
  const testEmail = `dashboard_customer_${ts}@testfinanz.com`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

  // --------------------------------------------------------------------------
  // SCENARIO 1: Happy Path to WAITING_ADMIN_REVIEW
  // --------------------------------------------------------------------------
  console.log('1️⃣ Creating borrower and advancing through full onboarding to WAITING_ADMIN_REVIEW...');
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'SecurePassword123!', phone: testPhone }),
  });
  const signupData = await signupRes.json();
  const accessToken = signupData.data.accessToken;
  const appId = signupData.data.application.id;

  // 2FA
  await fetch(`${API_BASE}/verification/email/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  await fetch(`${API_BASE}/verification/email/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });
  await fetch(`${API_BASE}/verification/phone/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  await fetch(`${API_BASE}/verification/phone/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });

  // KYC
  const kycRes = await fetch(`${API_BASE}/kyc/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Aarav Devendra Singhania',
      dob: '1990-05-15',
      gender: 'MALE',
      address: 'Penthouse 42, Hiranandani Gardens, Powai, Mumbai - 400076',
      idType: 'PAN',
      idNumber: 'ABCDE1234F',
    }),
  });
  if (!kycRes.ok) throw new Error(`KYC failed: ${await kycRes.text()}`);

  // Eligibility
  const eligRes = await fetch(`${API_BASE}/eligibility/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      income: 150000,
      requestedAmount: 600000,
      existingDebts: 15000,
      employerName: 'Tata Consultancy Services',
      designation: 'Principal Architect',
      creditScore: 810,
    }),
  });
  if (!eligRes.ok) throw new Error(`Eligibility failed: ${await eligRes.text()}`);

  // Loan Terms
  const termsRes = await fetch(`${API_BASE}/loan-terms/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 600000, tenureMonths: 24 }),
  });
  if (!termsRes.ok) throw new Error(`Loan terms failed: ${await termsRes.text()}`);

  // Bank Account
  const bankRes = await fetch(`${API_BASE}/bank-account/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountNumber: '50100456789123',
      ifsc: 'HDFC0000123',
      bankName: 'HDFC Bank Ltd',
      holderName: 'Aarav Devendra Singhania',
    }),
  });
  if (!bankRes.ok) throw new Error(`Bank account failed: ${await bankRes.text()}`);

  // Declaration
  const declRes = await fetch(`${API_BASE}/declaration/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted: true, termsVersion: 'v1.0' }),
  });
  if (!declRes.ok) throw new Error(`Declaration failed: ${await declRes.text()}`);

  // Selfie
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const selfieRes = await fetch(`${API_BASE}/selfie/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: dummyBase64 }),
  });
  if (!selfieRes.ok) throw new Error(`Selfie failed: ${await selfieRes.text()}`);
  console.log('   ✓ Onboarding completed up to WAITING_ADMIN_REVIEW.');

  // --------------------------------------------------------------------------
  // TEST CUSTOMER DASHBOARD ENDPOINT IN WAITING_ADMIN_REVIEW
  // --------------------------------------------------------------------------
  console.log('2️⃣ Querying Customer Dashboard Endpoint (GET /api/v1/auth/my-application)...');
  const dashRes = await fetch(`${API_BASE}/auth/my-application`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const dashData = await dashRes.json();
  if (!dashRes.ok || !dashData.success) throw new Error(`Dashboard fetch failed: ${JSON.stringify(dashData)}`);

  const app = dashData.data.application;
  console.log(`   ✓ Application ID: ${app.id}`);
  console.log(`   ✓ Current Stage: ${app.stage}`);
  console.log(`   ✓ KYC Summary: ${app.kycDetails?.fullName} (${app.kycDetails?.idType} ${app.kycDetails?.idNumber})`);
  console.log(`   ✓ Loan Terms: Principal: ₹${app.loanTerms?.amount}, EMI: ₹${app.loanTerms?.emi}, Tenure: ${app.loanTerms?.tenureMonths}M`);
  console.log(`   ✓ Bank Account: ${app.bankAccount?.bankName} (A/C: ${app.bankAccount?.accountNumber})`);
  console.log(`   ✓ Declaration: Version ${app.declaration?.termsVersion}, Timestamp: ${app.declaration?.acceptedAt}`);
  console.log(`   ✓ Selfie Status: ${app.selfie?.adminStatus}`);

  if (app.stage !== 'WAITING_ADMIN_REVIEW') throw new Error(`Expected stage WAITING_ADMIN_REVIEW, got: ${app.stage}`);
  if (!app.kycDetails || !app.eligibilityCheck || !app.loanTerms || !app.bankAccount || !app.declaration || !app.selfie) {
    throw new Error('Customer dashboard payload missing one or more step relations!');
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: ADMIN APPROVAL -> APPROVED STATE
  // --------------------------------------------------------------------------
  console.log('\n3️⃣ Admin Approving Selfie & Application...');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ezfinanz.com', password: 'AdminPassword@123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.success) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  const adminToken = adminLoginData.data.accessToken;

  const approveRes = await fetch(`${API_BASE}/admin/applications/${appId}/selfie/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  });
  const approveData = await approveRes.json();
  console.log(`   ✓ Admin Approval response: ${approveData.data.application.stage}`);

  // Re-verify customer dashboard in APPROVED state
  const dashApprovedRes = await fetch(`${API_BASE}/auth/my-application`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const dashApprovedData = await dashApprovedRes.json();
  console.log(`   ✓ Customer Dashboard updated stage: ${dashApprovedData.data.application.stage}`);
  console.log(`   ✓ Selfie Admin Status: ${dashApprovedData.data.application.selfie.adminStatus}`);
  if (dashApprovedData.data.application.stage !== 'APPROVED') throw new Error('Expected stage APPROVED');

  // --------------------------------------------------------------------------
  // SCENARIO 3: ADMIN DISBURSEMENT -> DISBURSED STATE
  // --------------------------------------------------------------------------
  console.log('\n4️⃣ Admin Disbursing Loan Funds...');
  const disburseRes = await fetch(`${API_BASE}/admin/applications/${appId}/disburse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  });
  const disburseData = await disburseRes.json();
  console.log(`   ✓ Loan Disbursed! Reference: ${disburseData.data.referenceId}`);

  // Re-verify customer dashboard in DISBURSED state
  const dashDisbursedRes = await fetch(`${API_BASE}/auth/my-application`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const dashDisbursedData = await dashDisbursedRes.json();
  console.log(`   ✓ Customer Dashboard final stage: ${dashDisbursedData.data.application.stage}`);
  if (dashDisbursedData.data.application.stage !== 'DISBURSED') throw new Error('Expected stage DISBURSED');

  // --------------------------------------------------------------------------
  // SCENARIO 4: REJECTED OUTCOME STATE
  // --------------------------------------------------------------------------
  console.log('\n5️⃣ Testing REJECTED Outcome State (Separate Borrower)...');
  const rejectedEmail = `rejected_customer_${ts}@testfinanz.com`;
  const rejectedPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

  const rejSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: rejectedEmail, password: 'SecurePassword123!', phone: rejectedPhone }),
  });
  const rejSignupData = await rejSignupRes.json();
  const rejToken = rejSignupData.data.accessToken;
  const rejAppId = rejSignupData.data.application.id;

  // 2FA
  await fetch(`${API_BASE}/verification/email/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
  });
  await fetch(`${API_BASE}/verification/email/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });
  await fetch(`${API_BASE}/verification/phone/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
  });
  await fetch(`${API_BASE}/verification/phone/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: '123456' }),
  });

  // KYC
  const rejKycRes = await fetch(`${API_BASE}/kyc/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rohan Verma',
      dob: '1995-08-20',
      gender: 'MALE',
      address: 'Flat 101, Green Heights, Pune',
      idType: 'PAN',
      idNumber: 'ABCDE5678G',
    }),
  });
  if (!rejKycRes.ok) throw new Error(`Rej KYC failed: ${await rejKycRes.text()}`);

  // Eligibility
  const rejEligRes = await fetch(`${API_BASE}/eligibility/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      income: 45000,
      requestedAmount: 150000,
      existingDebts: 5000,
      employerName: 'InfoTech Solutions',
      designation: 'Junior Developer',
      creditScore: 720,
    }),
  });
  if (!rejEligRes.ok) throw new Error(`Rej Eligibility failed: ${await rejEligRes.text()}`);

  // Loan Terms
  const rejTermsRes = await fetch(`${API_BASE}/loan-terms/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 150000, tenureMonths: 12 }),
  });
  if (!rejTermsRes.ok) throw new Error(`Rej Loan terms failed: ${await rejTermsRes.text()}`);

  // Bank
  const rejBankRes = await fetch(`${API_BASE}/bank-account/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountNumber: '987654321012',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      holderName: 'Rohan Verma',
    }),
  });
  if (!rejBankRes.ok) throw new Error(`Rej Bank failed: ${await rejBankRes.text()}`);

  // Declaration
  const rejDeclRes = await fetch(`${API_BASE}/declaration/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted: true, termsVersion: 'v1.0' }),
  });
  if (!rejDeclRes.ok) throw new Error(`Rej Decl failed: ${await rejDeclRes.text()}`);

  // Selfie
  const rejSelfieRes = await fetch(`${API_BASE}/selfie/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rejToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: dummyBase64 }),
  });
  if (!rejSelfieRes.ok) throw new Error(`Rej Selfie failed: ${await rejSelfieRes.text()}`);

  // Admin Rejects Selfie
  const rejectRes = await fetch(`${API_BASE}/admin/applications/${rejAppId}/selfie/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Selfie photo blurry and does not match PAN identity document.' }),
  });
  const rejectData = await rejectRes.json();
  console.log(`   ✓ Admin Rejection confirmed. Stage: ${rejectData.data.application.stage}`);

  // Query Customer Dashboard for Rejected User
  const rejDashRes = await fetch(`${API_BASE}/auth/my-application`, {
    headers: { Authorization: `Bearer ${rejToken}` },
  });
  const rejDashData = await rejDashRes.json();
  console.log(`   ✓ Customer Dashboard Rejected Stage: ${rejDashData.data.application.stage}`);
  console.log(`   ✓ Rejection Reason: ${rejDashData.data.application.selfie.rejectReason}`);
  if (rejDashData.data.application.stage !== 'REJECTED') throw new Error('Expected stage REJECTED');
  if (!rejDashData.data.application.selfie.rejectReason) throw new Error('Expected rejection reason to be present');

  console.log('\n================================================================================');
  console.log('   🎉 CHUNK 20 CUSTOMER DASHBOARD VERIFICATION COMPLETED WITH 100% SUCCESS!   ');
  console.log('================================================================================\n');
}

runChunk20Verification().catch((err) => {
  console.error('\n❌ Chunk 20 Verification Failed:', err);
  process.exit(1);
});
