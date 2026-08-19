import { Router } from 'express';
import { Role } from '@prisma/client';
import { adminController } from './admin.controller';
import { listApplicationsSchema } from './admin.schema';
import { authGuard, roleGuard, validate } from '../../shared/middleware';

const router = Router();

// All admin routes strictly require authentication and ADMIN role permissions
router.use(authGuard);
router.use(roleGuard(Role.ADMIN));

router.get(
  '/applications',
  validate(listApplicationsSchema),
  adminController.listApplications
);

router.get('/applications/:id', adminController.getApplicationDetail);

router.get('/stats', adminController.getDashboardStats);

export const adminRoutes = router;
export default router;
