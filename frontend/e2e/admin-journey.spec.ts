import { test, expect } from '@playwright/test';
import { generateTestUser, setupWaitingAdminReviewApplication } from './helpers/e2e-helpers';

test.describe('E2E Admin Journey: Application Review, Selfie Approval & Disbursement', () => {
  const customerUser = generateTestUser('admin_appr');
  let applicationId: string;

  test.beforeAll(async ({ request }) => {
    const setup = await setupWaitingAdminReviewApplication(request, customerUser, 'Vikram Malhotra');
    applicationId = setup.applicationId;
  });

  test('should allow admin to log in, locate submitted application, approve selfie, and disburse loan', async ({
    page,
  }) => {
    // 1. Admin Login
    await page.goto('/login');
    await page.fill('input#email', 'admin@ezfinanz.com');
    await page.fill('input#password', 'AdminPassword@123');
    await page.click('button[type="submit"]');

    // Should redirect to /admin dashboard
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Underwriting Operations Portal' })).toBeVisible({ timeout: 15000 });

    // 2. Direct Navigation to target application detail view
    await page.goto(`/admin/applications/${applicationId}`);
    await expect(page.getByRole('heading', { name: 'Vikram Malhotra' })).toBeVisible({ timeout: 15000 });

    // 3. Approve Selfie
    const approveSelfieBtn = page.getByRole('button', { name: /Approve Biometric Identity/i });
    await expect(approveSelfieBtn).toBeVisible({ timeout: 10000 });
    await approveSelfieBtn.click();

    // Verify stage advances to APPROVED
    await expect(
      page.getByText('Application is Approved and Ready for Disbursement')
    ).toBeVisible({ timeout: 15000 });

    // 4. Confirm Disbursement
    const disburseBtn = page.getByRole('button', { name: /Confirm & Disburse Funds/i });
    await expect(disburseBtn).toBeVisible({ timeout: 10000 });
    await disburseBtn.click();

    // Verify final stage DISBURSED
    await expect(
      page.getByText('Loan Funds Successfully Disbursed')
    ).toBeVisible({ timeout: 20000 });
  });
});
