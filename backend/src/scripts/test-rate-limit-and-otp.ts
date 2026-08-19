/**
 * Test Rate Limiting Bypass in Dev and Phone OTP Login
 */

const API_BASE = 'http://localhost:5000/api/v1';

async function testOtpAndRateLimit() {
  console.log('================================================================================');
  console.log('         TESTING PHONE OTP LOGIN & RATE LIMITING BEHAVIOR         ');
  console.log('================================================================================\n');

  const phone = '6300716868';

  console.log(`1️⃣ Sending Phone Login OTP to +91 ${phone}...`);
  const sendRes = await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose: 'LOGIN' }),
  });
  const sendData = await sendRes.json();
  console.log('   Status:', sendRes.status);
  console.log('   Response:', JSON.stringify(sendData));
  if (!sendRes.ok || !sendData.success) {
    throw new Error(`Failed to send OTP: ${JSON.stringify(sendData)}`);
  }

  console.log('\n2️⃣ Testing rapid successive requests (verifying no 429 rate limit block in dev)...');
  for (let i = 1; i <= 20; i++) {
    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, purpose: 'LOGIN' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Request #${i} failed with status ${res.status}: ${JSON.stringify(err)}`);
    }
  }
  console.log('   ✓ Sent 20 rapid requests consecutively: 0 rate limit blocks (100% SUCCESS)');

  console.log(`\n3️⃣ Verifying Phone Login OTP with universal demo bypass OTP '123456'...`);
  const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456', purpose: 'LOGIN' }),
  });
  const verifyData = await verifyRes.json();
  console.log('   Status:', verifyRes.status);
  console.log('   Response User:', verifyData.data?.user?.phone, '| Role:', verifyData.data?.user?.role);
  console.log('   Response Application ID:', verifyData.data?.application?.id);
  console.log('   Access Token Issued:', Boolean(verifyData.data?.accessToken));

  if (!verifyRes.ok || !verifyData.success || !verifyData.data?.accessToken) {
    throw new Error(`Failed to verify OTP: ${JSON.stringify(verifyData)}`);
  }

  console.log('\n================================================================================');
  console.log('   🎉 PHONE OTP LOGIN & RATE LIMITING TESTS PASSED WITH 100% SUCCESS!   ');
  console.log('================================================================================\n');
}

testOtpAndRateLimit().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
