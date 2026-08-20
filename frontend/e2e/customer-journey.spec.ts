import { test, expect } from '@playwright/test';
import { generateTestUser, fetchLatestOtp, enterOtp, SAMPLE_PNG_BUFFER } from './helpers/e2e-helpers';

test.describe('E2E Customer Journey: Complete Onboarding Lifecycle', () => {
  test.setTimeout(180000);

  const user = generateTestUser('e2e_cust');

  test('should execute entire 8-step customer loan application journey successfully', async ({ page }) => {
    // -------------------------------------------------------------
    // STEP 1: Customer Signup
    // -------------------------------------------------------------
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Sign Up|EZFinanz/i);

    await page.fill('input#email', user.email);
    await page.fill('input#phone', user.phone);
    await page.fill('input#password', user.password);
    await page.fill('input#confirmPassword', user.password);

    await page.click('button[type="submit"]');

    // Should navigate to /verify or /apply
    await page.waitForURL(/\/verify|\/apply/, { timeout: 20000 });
    if (!page.url().includes('/verify')) {
      await page.goto('/verify');
    }

    // -------------------------------------------------------------
    // STEP 2: Email & Phone Dual Verification
    // -------------------------------------------------------------
    // A. Email Verification
    const sendEmailOtpBtn = page.getByRole('button', { name: /Send Email OTP/i });
    await expect(sendEmailOtpBtn).toBeVisible({ timeout: 15000 });
    await sendEmailOtpBtn.click();

    const emailOtp = await fetchLatestOtp(user.email, 'EMAIL_VERIFICATION');
    await enterOtp(page, emailOtp);

    const verifyEmailBtn = page.getByRole('button', { name: /Verify Email OTP/i });
    await verifyEmailBtn.click();

    // B. Phone Verification
    const sendPhoneOtpBtn = page.getByRole('button', { name: /Send Phone OTP/i });
    await expect(sendPhoneOtpBtn).toBeVisible({ timeout: 15000 });
    await sendPhoneOtpBtn.click();

    const phoneOtp = await fetchLatestOtp(user.phone, 'PHONE_VERIFICATION');
    await enterOtp(page, phoneOtp);

    const verifyPhoneBtn = page.getByRole('button', { name: /Verify Phone OTP/i });
    await verifyPhoneBtn.click();

    // -------------------------------------------------------------
    // STEP 3: KYC Details Submission
    // -------------------------------------------------------------
    await page.waitForURL(/\/apply/, { timeout: 20000 });
    if (!page.url().includes('/apply')) {
      await page.goto('/apply');
    }

    await page.fill('input#fullName', 'Aarav Sharma');
    await page.fill('input#dob', '1990-05-15');
    await page.fill('textarea#address', '123 Bandra Kurla Complex, Mumbai, Maharashtra 400051');
    await page.fill('input#idNumber', 'ABCPS1234A');

    // Optional document upload
    const kycFileInput = page.locator('input[type="file"]');
    if ((await kycFileInput.count()) > 0) {
      await kycFileInput.setInputFiles({
        name: 'pan-card.png',
        mimeType: 'image/png',
        buffer: SAMPLE_PNG_BUFFER,
      });
    }

    await page.click('button[type="submit"]');

    // -------------------------------------------------------------
    // STEP 4: Eligibility Assessment
    // -------------------------------------------------------------
    await expect(page.locator('input#monthlyIncome')).toBeVisible({ timeout: 20000 });

    // Fill income & employment parameters
    await page.fill('input#monthlyIncome', '75000');
    await page.fill('input#requestedAmount', '300000');
    await page.fill('input#existingDebts', '10000');
    await page.fill('input#employerName', 'Tata Consultancy Services');
    await page.fill('input#designation', 'Senior Software Engineer');

    await page.click('button[type="submit"]');

    // -------------------------------------------------------------
    // STEP 5: Loan Terms & EMI Selection
    // -------------------------------------------------------------
    const confirmTermsBtn = page.getByRole('button', { name: /Confirm & Lock Loan Terms/i });
    await expect(confirmTermsBtn).toBeVisible({ timeout: 20000 });
    await expect(confirmTermsBtn).toBeEnabled({ timeout: 20000 });
    await confirmTermsBtn.click();

    // -------------------------------------------------------------
    // STEP 6: Bank Account Linking
    // -------------------------------------------------------------
    await expect(page.locator('input#accountNumber')).toBeVisible({ timeout: 20000 });

    await page.fill('input#holderName', 'Aarav Sharma');
    await page.fill('input#accountNumber', '123456789012');
    await page.fill('input#confirmAccountNumber', '123456789012');
    await page.fill('input#ifsc', 'HDFC0001234');
    await page.fill('input#bankName', 'HDFC Bank Ltd');

    const submitBankBtn = page.getByRole('button', { name: /Save & Continue to Declaration/i });
    await submitBankBtn.click();

    // -------------------------------------------------------------
    // STEP 7: Legal Declaration & Agreement
    // -------------------------------------------------------------
    const agreementCheckbox = page.locator('div[role="checkbox"]').or(page.locator('text=I accept and agree to all terms'));
    await expect(agreementCheckbox.first()).toBeVisible({ timeout: 20000 });
    await agreementCheckbox.first().click();

    const acceptDeclarationBtn = page.getByRole('button', { name: /Accept & Confirm Declaration/i });
    await acceptDeclarationBtn.click();

    // -------------------------------------------------------------
    // STEP 8: Biometric Selfie Photo Submission
    // -------------------------------------------------------------
    const selfieFileInput = page.locator('input[type="file"]').first();
    await expect(selfieFileInput).toBeAttached({ timeout: 20000 });
    await selfieFileInput.setInputFiles({
      name: 'selfie-verification.png',
      mimeType: 'image/png',
      buffer: SAMPLE_PNG_BUFFER,
    });

    const submitSelfieBtn = page.getByRole('button', { name: /Confirm & Submit Selfie/i });
    await submitSelfieBtn.click();

    // Verify Final Success / "Waiting for Admin Review" Screen
    await expect(page.locator('text=WAITING_ADMIN_REVIEW').first()).toBeVisible({ timeout: 25000 });
  });
});
