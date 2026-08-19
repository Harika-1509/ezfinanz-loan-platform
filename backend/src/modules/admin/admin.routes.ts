import { Router } from 'express';
import { Role } from '@prisma/client';
import { adminController } from './admin.controller';
import {
  listApplicationsSchema,
  reviewSelfieSchema,
  rejectSelfieSchema,
  disburseLoanSchema,
} from './admin.schema';
import { authGuard, roleGuard, validate } from '../../shared/middleware';

const router = Router();

// All admin routes strictly require authentication and ADMIN role permissions
router.use(authGuard);
router.use(roleGuard(Role.ADMIN));

// Application queries
router.get(
  '/applications',
  validate(listApplicationsSchema),
  adminController.listApplications
);

router.get('/applications/:id', adminController.getApplicationDetail);

router.get('/stats', adminController.getDashboardStats);

// Administrative Actions: Selfie Review & Loan Disbursement
router.post(
  '/applications/:id/selfie/review',
  validate(reviewSelfieSchema),
  adminController.reviewSelfie
);

router.post(
  '/applications/:id/selfie/approve',
  adminController.approveSelfie
);

router.post(
  '/applications/:id/selfie/reject',
  validate(rejectSelfieSchema),
  adminController.rejectSelfie
);

router.post(
  '/applications/:id/disburse',
  validate(disburseLoanSchema),
  adminController.disburseLoan
);

export const adminRoutes = router;
export default router;
