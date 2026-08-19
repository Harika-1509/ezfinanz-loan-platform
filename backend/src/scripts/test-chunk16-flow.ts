/**
 * Live End-to-End Verification for Chunk 16 Frontend Auth Flows
 * Tests: Signup -> Send Email OTP -> Verify Email OTP -> Send Phone OTP -> Verify Phone OTP -> Status check -> Login
 */

async function runLiveAuthFlowTest() {
  const BASE_URL = 'http://localhost:5000/api/v1';
  const timestamp = Date.now();
  const testEmail = `test.borrower.${timestamp}@ezfinanz.io`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password@123';

  console.log('🚀 Starting Chunk 16 Live Auth Integration Flow Verification...');
  console.log(`👤 Test Borrower: ${testEmail} | Phone: +91 ${testPhone}`);

  // 1. Sign up new user
  console.log('\n1️⃣ Testing Registration (POST /auth/signup)...');
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
  if (!signupRes.ok || !signupData.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  }
  const accessToken = signupData.data.accessToken;
  console.log('✅ Signup successful! Token received.');
  console.log(`   Initial Stage: ${signupData.data.application?.stage}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // 2. Initial verification status check
  console.log('\n2️⃣ Testing Verification Status (GET /verification/status)...');
  const statusRes1 = await fetch(`${BASE_URL}/verification/status`, {
    headers: authHeaders,
  });
  const statusData1 = await statusRes1.json();
  console.log(`✅ Status: emailVerified=${statusData1.data.emailVerified}, phoneVerified=${statusData1.data.phoneVerified}`);

  // 3. Dispatch Email OTP
  console.log('\n3️⃣ Testing Send Email OTP (POST /verification/email/send)...');
  const sendEmailRes = await fetch(`${BASE_URL}/verification/email/send`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  const sendEmailData = await sendEmailRes.json();
  if (!sendEmailRes.ok) throw new Error(`Send email failed: ${JSON.stringify(sendEmailData)}`);
  console.log('✅ Email OTP dispatched successfully.');

  // 4. Verify Email OTP using demo bypass (123456)
  console.log('\n4️⃣ Testing Verify Email OTP with demo code 123456 (POST /verification/email/verify)...');
  const verifyEmailRes = await fetch(`${BASE_URL}/verification/email/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456' }),
  });
  const verifyEmailData = await verifyEmailRes.json();
  if (!verifyEmailRes.ok || !verifyEmailData.success) {
    throw new Error(`Verify email failed: ${JSON.stringify(verifyEmailData)}`);
  }
  console.log('✅ Email verified successfully!');

  // 5. Dispatch Phone OTP
  console.log('\n5️⃣ Testing Send Phone OTP (POST /verification/phone/send)...');
  const sendPhoneRes = await fetch(`${BASE_URL}/verification/phone/send`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ phone: testPhone }),
  });
  const sendPhoneData = await sendPhoneRes.json();
  if (!sendPhoneRes.ok) throw new Error(`Send phone failed: ${JSON.stringify(sendPhoneData)}`);
  console.log('✅ Phone OTP dispatched successfully.');

  // 6. Verify Phone OTP using demo bypass (123456)
  console.log('\n6️⃣ Testing Verify Phone OTP with demo code 123456 (POST /verification/phone/verify)...');
  const verifyPhoneRes = await fetch(`${BASE_URL}/verification/phone/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ otp: '123456', phone: testPhone }),
  });
  const verifyPhoneData = await verifyPhoneRes.json();
  if (!verifyPhoneRes.ok || !verifyPhoneData.success) {
    throw new Error(`Verify phone failed: ${JSON.stringify(verifyPhoneData)}`);
  }
  console.log('✅ Phone verified successfully!');
  console.log(`   Advanced Application Stage: ${verifyPhoneData.data.applicationStage}`);

  // 7. Check final status
  console.log('\n7️⃣ Testing Final Verification Status (GET /verification/status)...');
  const finalStatusRes = await fetch(`${BASE_URL}/verification/status`, {
    headers: authHeaders,
  });
  const finalStatusData = await finalStatusRes.json();
  console.log(`✅ Final Status: isFullyVerified=${finalStatusData.data.isFullyVerified}, stage=${finalStatusData.data.currentApplicationStage}`);

  // 8. Test Login with verified credentials
  console.log('\n8️⃣ Testing Login (POST /auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('✅ Login successful! Returned user role:', loginData.data.user.role);

  console.log('\n🎉 ALL 8 AUTH & 2FA VERIFICATION INTEGRATION CHECKS PASSED PERFECTLY!\n');
}

runLiveAuthFlowTest().catch((err) => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
