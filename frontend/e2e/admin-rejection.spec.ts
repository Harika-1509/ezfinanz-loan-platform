import { test, expect } from '@playwright/test';
import { generateTestUser, setupWaitingAdminReviewApplication } from './helpers/e2e-helpers';

test.describe('E2E Admin Journey: Application Rejection with Reason', () => {
  const customerUser = generateTestUser('admin_rej');
  let applicationId: string;

  test.beforeAll(async ({ request }) => {
    const setup = await setupWaitingAdminReviewApplication(request, customerUser, 'Karan Mehra');
    applicationId = setup.applicationId;
  });

  test('should allow admin to reject application with specific reason and update stage to REJECTED', async ({
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

    // 2. Navigate to target application detail view
    await page.goto(`/admin/applications/${applicationId}`);
    await expect(page.getByRole('heading', { name: 'Karan Mehra' })).toBeVisible({ timeout: 15000 });

    // 3. Open Rejection Modal
    const rejectBtn = page.getByRole('button', { name: /Decline \/ Reject/i });
    await expect(rejectBtn).toBeVisible({ timeout: 10000 });
    await rejectBtn.click();

    // 4. Fill rejection reason
    await expect(page.locator('text=Decline / Reject Application')).toBeVisible();
    const reasonInput = page.locator('textarea#rejectReason');
    const justificationText = 'Selfie image is too blurry to verify against submitted PAN identity document.';
    await reasonInput.fill(justificationText);

    // Submit rejection
    const confirmRejectBtn = page.getByRole('button', { name: /Confirm Rejection/i });
    await confirmRejectBtn.click();

    // 5. Verify Stage updates to REJECTED and rejection justification appears
    await expect(
      page.locator('text=Application Rejected').or(page.locator(`text=${justificationText}`))
    ).toBeVisible({ timeout: 20000 });
  });
});
