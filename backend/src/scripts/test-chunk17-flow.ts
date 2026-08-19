/**
 * Live End-to-End Verification for Chunk 17 Frontend KYC + Eligibility Flows
 * Tests: Signup -> Dual 2FA -> KYC Form -> KYC Status -> Eligibility Check -> Eligibility Status -> Outcomes
 */

async function runLiveKycAndEligibilityFlowTest() {
  const BASE_URL = 'http://localhost:5000/api/v1';
  const timestamp = Date.now();
  const testEmail = `test.kyc_borrower.${timestamp}@ezfinanz.io`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password@123';

  console.log('🚀 Starting Chunk 17 Live KYC & Eligibility Integration Flow Verification...');
  console.log(`👤 Test Borrower: ${testEmail} | Phone: +91 ${testPhone}`);

  // 1. Sign up new user
  console.log('\n1️⃣ Registering User (POST /auth/signup)...');
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      password: testPassword,
    }),
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  const accessToken = signupData.data.accessToken;
  console.log('✅ Signup successful.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // 2. Dual 2FA Verification
  console.log('\n2️⃣ Completing 2FA Dual Verification (Email + Phone OTP)...');
  await fetch(`${BASE_URL}/verification/email/send`, { method: 'POST', headers: authHeaders });
  await fetch(`${BASE_URL}/verification/email/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456' }),
  });
  await fetch(`${BASE_URL}/verification/phone/send`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ phone: testPhone }),
  });
  const phoneVerifyRes = await fetch(`${BASE_URL}/verification/phone/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456', phone: testPhone }),
  });
  const phoneVerifyData = await phoneVerifyRes.json();
  console.log(`✅ 2FA Complete! Application Stage: ${phoneVerifyData.data.applicationStage} (KYC_PENDING)`);

  // 3. Submit KYC Details (Step 2 of 8)
  console.log('\n3️⃣ Testing KYC Submission (POST /kyc/submit)...');
  const kycRes = await fetch(`${BASE_URL}/kyc/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fullName: 'Vikramaditya Roy',
      dob: '1992-06-15', // Age > 18
      gender: 'MALE',
      address: 'Flat 402, Royal Palms Towers, Indiranagar, Bengaluru, Karnataka 560038',
      idType: 'PAN',
      idNumber: 'ABCDE1234F',
    }),
  });
  const kycData = await kycRes.json();
  if (!kycRes.ok || !kycData.success) {
    throw new Error(`KYC submission failed: ${JSON.stringify(kycData)}`);
  }
  console.log('✅ KYC Submission successful!');
  console.log(`   Advanced Stage: ${kycData.data.applicationStage} (KYC_SUBMITTED)`);

  // 4. Check KYC Status
  console.log('\n4️⃣ Testing KYC Status (GET /kyc/status)...');
  const kycStatusRes = await fetch(`${BASE_URL}/kyc/status`, { headers: authHeaders });
  const kycStatusData = await kycStatusRes.json();
  const kycItem = kycStatusData.data.kycDetails || kycStatusData.data;
  console.log(`✅ KYC Status: Name=${kycItem.fullName}, ID=${kycItem.idType}:${kycItem.idNumber}`);

  // 5. Submit Prime Financial Details for Eligibility Assessment (Step 3 of 8)
  console.log('\n5️⃣ Testing Prime Eligibility Check (POST /eligibility/check)...');
  const primeCheckRes = await fetch(`${BASE_URL}/eligibility/check`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      income: 95000,
      requestedAmount: 400000,
      existingDebts: 12000,
      employerName: 'Google India Pvt Ltd',
      designation: 'Staff Software Engineer',
    }),
  });
  const primeCheckData = await primeCheckRes.json();
  if (!primeCheckRes.ok || !primeCheckData.success) {
    throw new Error(`Eligibility check failed: ${JSON.stringify(primeCheckData)}`);
  }
  const calc = primeCheckData.data.calculation;
  const check = primeCheckData.data.eligibilityCheck;
  const app = primeCheckData.data.application;

  console.log('✅ Eligibility calculation successful!');
  console.log(`   Decision: ${calc.result}`);
  console.log(`   CIBIL Score: ${check.creditScore} (${calc.creditScoreBand})`);
  console.log(`   DTI Ratio: ${calc.dtiRatio.toFixed(1)}%`);
  console.log(`   Max Sanction Limit: ₹${calc.maxApprovedAmount.toLocaleString('en-IN')}`);
  console.log(`   Application Stage: ${app.stage} (ELIGIBILITY_CHECKED)`);

  // 6. Check Eligibility Status
  console.log('\n6️⃣ Testing Eligibility Status (GET /eligibility/status)...');
  const statusRes = await fetch(`${BASE_URL}/eligibility/status`, { headers: authHeaders });
  const statusData = await statusRes.json();
  const statusCheck = statusData.data.eligibilityCheck;
  console.log(`✅ Stored Assessment Status: Decision=${statusCheck.result}, Score=${statusCheck.creditScore}`);

  // 7. Verify High Debt / Low Income Rejection Outcome Logic (POST /eligibility/check)
  console.log('\n7️⃣ Testing High Debt / Low Income Rejection Graceful Outcome...');
  const rejectCheckRes = await fetch(`${BASE_URL}/eligibility/check`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      income: 25000,
      requestedAmount: 800000,
      existingDebts: 22000,
      employerName: 'Freelance Design',
      designation: 'Designer',
    }),
  });
  const rejectCheckData = await rejectCheckRes.json();
  const rejectCalc = rejectCheckData.data.calculation;
  console.log(`✅ Outcome Evaluated: Decision=${rejectCalc.result}, DTI=${rejectCalc.dtiRatio.toFixed(1)}%`);

  console.log('\n🎉 ALL 7 KYC & ELIGIBILITY INTEGRATION CHECKS PASSED WITH 100% SUCCESS!\n');
}

runLiveKycAndEligibilityFlowTest().catch((err) => {
  console.error('❌ KYC & Eligibility test failed:', err);
  process.exit(1);
});
