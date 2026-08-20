import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  phone: string;
  password: string;
}

/**
 * Generates a unique test customer with valid unique 10-digit Indian phone number
 */
export function generateTestUser(prefix: string = 'cust'): TestUser {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const uniquePhoneNum = (timestamp % 1000000000).toString().padStart(9, '0');
  return {
    email: `${prefix}_${timestamp}_${randomSuffix}@ezfinanz.test`,
    phone: `9${uniquePhoneNum}`,
    password: 'Password@123',
  };
}

/**
 * Retrieves the latest dynamic OTP from the dev endpoint with retries
 */
export async function fetchLatestOtp(identifier: string, purpose?: string): Promise<string> {
  const url = `http://127.0.0.1:5000/api/v1/auth/dev/latest-otp?identifier=${encodeURIComponent(
    identifier
  )}${purpose ? `&purpose=${encodeURIComponent(purpose)}` : ''}`;

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.otp) {
          return data.data.otp;
        }
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Failed to retrieve OTP for identifier ${identifier} after 20 attempts.`);
}

/**
 * Enters a 6-digit OTP into the frontend OtpInput component with natural keystrokes
 */
export async function enterOtp(page: Page, otp: string): Promise<void> {
  expect(otp).toHaveLength(6);
  const firstInput = page.locator('input[aria-label="Digit 1"]').or(page.locator('input[type="text"]').first());
  await firstInput.first().focus();
  // Clear any existing input
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  // Type with delay for React state updates and auto-focus advance
  await page.keyboard.type(otp, { delay: 100 });
  await page.waitForTimeout(200);
}

/**
 * 1x1 Transparent PNG Buffer for file upload testing
 */
export const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export const SAMPLE_SELFIE_BASE64 = `data:image/png;base64,${SAMPLE_PNG_BUFFER.toString('base64')}`;

/**
 * Sets up a fully verified customer application at the WAITING_ADMIN_REVIEW stage
 */
export async function setupWaitingAdminReviewApplication(
  request: any,
  user: TestUser,
  name: string = 'Test Applicant'
): Promise<{ applicationId: string; token: string }> {
  // 1. Signup
  const signupRes = await request.post('http://127.0.0.1:5000/api/v1/auth/signup', {
    headers: { 'Content-Type': 'application/json' },
    data: user,
  });
  const signupJson = await signupRes.json();
  if (!signupJson.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupJson)}`);
  }
  const token = signupJson.data.accessToken;
  const applicationId = signupJson.data.application.id;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Email verification
  await request.post('http://127.0.0.1:5000/api/v1/verification/email/send', { headers: authHeaders });
  const emailOtp = await fetchLatestOtp(user.email, 'EMAIL_VERIFICATION');
  await request.post('http://127.0.0.1:5000/api/v1/verification/email/verify', {
    headers: authHeaders,
    data: { otp: emailOtp, email: user.email },
  });

  // 3. Phone verification
  await request.post('http://127.0.0.1:5000/api/v1/verification/phone/send', { headers: authHeaders });
  const phoneOtp = await fetchLatestOtp(user.phone, 'PHONE_VERIFICATION');
  await request.post('http://127.0.0.1:5000/api/v1/verification/phone/verify', {
    headers: authHeaders,
    data: { otp: phoneOtp, phone: user.phone },
  });

  // 4. KYC
  await request.post('http://127.0.0.1:5000/api/v1/kyc/submit', {
    headers: authHeaders,
    data: {
      fullName: name,
      dob: '1990-05-15',
      gender: 'MALE',
      address: '123 MG Road, Bengaluru, Karnataka 560001',
      idType: 'PAN',
      idNumber: 'ABCPS1234A',
    },
  });

  // 5. Eligibility
  await request.post('http://127.0.0.1:5000/api/v1/eligibility/check', {
    headers: authHeaders,
    data: {
      income: 80000,
      requestedAmount: 400000,
      existingDebts: 10000,
      employerName: 'Tata Consultancy Services',
      designation: 'Lead Engineer',
    },
  });

  // 6. Loan terms
  await request.post('http://127.0.0.1:5000/api/v1/loan-terms/confirm', {
    headers: authHeaders,
    data: {
      amount: 400000,
      tenureMonths: 24,
    },
  });

  // 7. Bank account
  await request.post('http://127.0.0.1:5000/api/v1/bank-account/submit', {
    headers: authHeaders,
    data: {
      holderName: name,
      accountNumber: '123456789012',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd',
    },
  });

  // 8. Declaration
  await request.post('http://127.0.0.1:5000/api/v1/declaration/accept', {
    headers: authHeaders,
    data: {
      accepted: true,
      termsVersion: 'v1.0',
    },
  });

  // 9. Selfie
  await request.post('http://127.0.0.1:5000/api/v1/selfie/submit', {
    headers: authHeaders,
    data: {
      imageBase64: SAMPLE_SELFIE_BASE64,
    },
  });

  return { applicationId, token };
}
