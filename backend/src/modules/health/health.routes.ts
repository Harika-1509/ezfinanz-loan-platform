import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

// GET /health and /api/v1/health
router.get('/', healthController.checkHealth);

export default router;
