import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Base API route aggregator
router.use('/health', healthRoutes);

export default router;
