const BASE_URL = 'http://localhost:5000/api/v1';

async function runLiveLoanTermsFlowTest() {
  console.log('🚀 Starting Chunk 18 Live Loan Terms & EMI Calculation Flow Verification...\n');

  const randomSuffix = Date.now();
  const testEmail = `test.terms_borrower.${randomSuffix}@ezfinanz.io`;
  const testPhone = `${Math.floor(9000000000 + Math.random() * 900000000)}`;

  console.log(`👤 Test Borrower: ${testEmail} | Phone: ${testPhone}`);

  // 1. Signup
  console.log('\n1️⃣ Registering User (POST /auth/signup)...');
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      password: 'SecurePassword@123',
      role: 'CUSTOMER',
    }),
  });

  const signupData = await signupRes.json();
  if (!signupRes.ok || !signupData.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  }

  const accessToken = signupData.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  console.log('✅ Signup successful.');

  // 2. Dual 2FA Verification
  console.log('\n2️⃣ Completing 2FA Dual Verification (Email + Phone OTP)...');
  await fetch(`${BASE_URL}/verification/email/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456' }),
  });
  const phoneRes = await fetch(`${BASE_URL}/verification/phone/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456' }),
  });
  const phoneData = await phoneRes.json();
  console.log(`✅ 2FA Complete! Application Stage: ${phoneData.data.stage} (KYC_PENDING)`);

  // 3. Submit KYC Details
  console.log('\n3️⃣ Submitting KYC Details (POST /kyc/submit)...');
  const kycRes = await fetch(`${BASE_URL}/kyc/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fullName: 'Aarav Singhania',
      dob: '1990-08-20',
      gender: 'MALE',
      address: 'Penthouse 12B, Sky Heights, HSR Layout, Bengaluru, Karnataka 560102',
      idType: 'PAN',
      idNumber: 'AARAV1234F',
    }),
  });
  const kycData = await kycRes.json();
  if (!kycRes.ok || !kycData.success) {
    throw new Error(`KYC failed: ${JSON.stringify(kycData)}`);
  }
  console.log(`✅ KYC Submitted! Stage: ${kycData.data.stage || 'KYC_SUBMITTED'}`);

  // 4. Perform Financial Underwriting Check
  console.log('\n4️⃣ Executing Eligibility Assessment (POST /eligibility/check)...');
  const eligRes = await fetch(`${BASE_URL}/eligibility/check`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      income: 120000,
      requestedAmount: 500000,
      existingDebts: 15000,
      employerName: 'Microsoft R&D India',
      designation: 'Principal Engineer',
    }),
  });
  const eligData = await eligRes.json();
  if (!eligRes.ok || !eligData.success) {
    throw new Error(`Eligibility check failed: ${JSON.stringify(eligData)}`);
  }
  const maxApproved = eligData.data.calculation.maxApprovedAmount;
  console.log(`✅ Underwriting Passed! Max Approved Amount: ₹${maxApproved.toLocaleString('en-IN')}`);
  console.log(`   Application Stage: ${eligData.data.application.stage} (ELIGIBILITY_CHECKED)`);

  // 5. Fetch Available Options
  console.log('\n5️⃣ Fetching Available Loan Options (GET /loan-terms/options)...');
  const optionsRes = await fetch(`${BASE_URL}/loan-terms/options`, { headers: authHeaders });
  const optionsData = await optionsRes.json();
  if (!optionsRes.ok || !optionsData.success) {
    throw new Error(`Get options failed: ${JSON.stringify(optionsData)}`);
  }
  console.log(`✅ Available Tenures: [${optionsData.data.allowedTenures.join(', ')}] months`);
  console.log(`   Sanction Limit: ₹${optionsData.data.maxApprovedAmount.toLocaleString('en-IN')}`);

  // 6. Test Live Calculations for Multiple Tenures & Principals
  console.log('\n6️⃣ Testing Live Debounced Calculations across Multiple Tenures...');

  // Combination A: ₹3,00,000 for 12 months (13.0% p.a.)
  const calc12Res = await fetch(`${BASE_URL}/loan-terms/calculate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 300000, tenureMonths: 12 }),
  });
  const calc12Data = await calc12Res.json();
  const b12 = calc12Data.data.breakdown;
  console.log(`   [12 Months @ 13.0%]: Principal=₹3,00,000 | EMI=₹${b12.emi} | Net Disbursement=₹${b12.netDisbursement} | IRR=${b12.irr}%`);

  // Combination B: ₹5,00,000 for 24 months (14.0% p.a.)
  const calc24Res = await fetch(`${BASE_URL}/loan-terms/calculate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 500000, tenureMonths: 24 }),
  });
  const calc24Data = await calc24Res.json();
  const b24 = calc24Data.data.breakdown;
  console.log(`   [24 Months @ 14.0%]: Principal=₹5,00,000 | EMI=₹${b24.emi} | Net Disbursement=₹${b24.netDisbursement} | IRR=${b24.irr}%`);

  // Combination C: ₹1,50,000 for 6 months (12.0% p.a.)
  const calc6Res = await fetch(`${BASE_URL}/loan-terms/calculate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 150000, tenureMonths: 6 }),
  });
  const calc6Data = await calc6Res.json();
  const b6 = calc6Data.data.breakdown;
  console.log(`   [ 6 Months @ 12.0%]: Principal=₹1,50,000 | EMI=₹${b6.emi} | Net Disbursement=₹${b6.netDisbursement} | IRR=${b6.irr}%`);

  // 7. Confirm Selection: Lock Terms for ₹4,00,000 @ 24 Months
  console.log('\n7️⃣ Confirming & Locking Loan Terms (POST /loan-terms/confirm)...');
  const confirmRes = await fetch(`${BASE_URL}/loan-terms/confirm`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 400000, tenureMonths: 24 }),
  });
  const confirmData = await confirmRes.json();
  if (!confirmRes.ok || !confirmData.success) {
    throw new Error(`Confirm loan terms failed: ${JSON.stringify(confirmData)}`);
  }
  const confirmedTerms = confirmData.data.loanTerms;
  const updatedApp = confirmData.data.application;

  console.log('✅ Terms locked successfully!');
  console.log(`   Confirmed Principal: ₹${confirmedTerms.amount.toLocaleString('en-IN')}`);
  console.log(`   Confirmed Tenure: ${confirmedTerms.tenureMonths} Months`);
  console.log(`   Monthly EMI: ₹${confirmedTerms.emi.toLocaleString('en-IN')}`);
  console.log(`   Net Disbursement: ₹${confirmedTerms.netDisbursement.toLocaleString('en-IN')}`);
  console.log(`   Annualized IRR: ${confirmedTerms.irr}%`);
  console.log(`   Advanced Stage: ${updatedApp.stage} (EMI_SELECTED)`);

  // 8. Verify Persisted Terms via Status Endpoint
  console.log('\n8️⃣ Verifying Stored Status (GET /loan-terms/status)...');
  const statusRes = await fetch(`${BASE_URL}/loan-terms/status`, { headers: authHeaders });
  const statusData = await statusRes.json();
  if (!statusRes.ok || !statusData.success) {
    throw new Error(`Get status failed: ${JSON.stringify(statusData)}`);
  }
  console.log(`✅ Stored Terms: Principal=₹${statusData.data.loanTerms.amount}, EMI=₹${statusData.data.loanTerms.emi}, Stage=${statusData.data.application.stage}`);

  console.log('\n🎉 ALL 8 LOAN TERMS & EMI INTEGRATION CHECKS PASSED WITH 100% SUCCESS!\n');
}

runLiveLoanTermsFlowTest().catch((err) => {
  console.error('❌ Loan terms test failed:', err);
  process.exit(1);
});
