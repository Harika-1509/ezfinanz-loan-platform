import { test, expect } from '@playwright/test';
import { generateTestUser, fetchLatestOtp, enterOtp } from './helpers/e2e-helpers';

test.describe('E2E Eligibility: Not-Eligible Scenario', () => {
  test.setTimeout(120000);

  const user = generateTestUser('e2e_inelig');

  test('should display rejection UI and advice when applicant exceeds risk/DTI thresholds', async ({ page }) => {
    // 1. Signup
    await page.goto('/signup');
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

    // 2. Dual Verification (Email)
    const sendEmailOtpBtn = page.getByRole('button', { name: /Send Email OTP/i });
    await expect(sendEmailOtpBtn).toBeVisible({ timeout: 15000 });
    await sendEmailOtpBtn.click();

    const emailOtp = await fetchLatestOtp(user.email, 'EMAIL_VERIFICATION');
    await enterOtp(page, emailOtp);
    await page.getByRole('button', { name: /Verify Email OTP/i }).click();

    // Dual Verification (Phone)
    const sendPhoneOtpBtn = page.getByRole('button', { name: /Send Phone OTP/i });
    await expect(sendPhoneOtpBtn).toBeVisible({ timeout: 15000 });
    await sendPhoneOtpBtn.click();

    const phoneOtp = await fetchLatestOtp(user.phone, 'PHONE_VERIFICATION');
    await enterOtp(page, phoneOtp);
    await page.getByRole('button', { name: /Verify Phone OTP/i });
    await page.getByRole('button', { name: /Verify Phone OTP/i }).click();

    // 3. KYC Submission
    await page.waitForURL(/\/apply/, { timeout: 20000 });
    if (!page.url().includes('/apply')) {
      await page.goto('/apply');
    }

    await page.fill('input#fullName', 'Rohan Verma');
    await page.fill('input#dob', '1995-08-20');
    await page.fill('textarea#address', '456 MG Road, Bengaluru, Karnataka 560001');
    await page.fill('input#idNumber', 'XYZPB9999K');
    await page.click('button[type="submit"]');

    // 4. Eligibility Assessment with Overleveraged Parameters
    await expect(page.locator('input#monthlyIncome')).toBeVisible({ timeout: 20000 });

    await page.fill('input#monthlyIncome', '25000');
    await page.fill('input#requestedAmount', '900000');
    await page.fill('input#existingDebts', '20000');
    await page.fill('input#employerName', 'Freelance / Unlisted Firm');
    await page.fill('input#designation', 'Consultant');

    await page.click('button[type="submit"]');

    // 5. Assert Not-Eligible Result Display & Terms Lock Blocking
    await expect(
      page
        .locator('text=Loan terms selection is not available because the application was evaluated as NOT_ELIGIBLE')
        .or(page.locator('text=NOT_ELIGIBLE'))
        .or(page.locator('text=Application Criteria Not Met'))
    ).toBeVisible({ timeout: 20000 });

    // Assert that the loan confirmation button is disabled / locked
    const confirmBtn = page.getByRole('button', { name: /Confirm & Lock Loan Terms/i });
    await expect(confirmBtn).toBeDisabled();
  });
});
