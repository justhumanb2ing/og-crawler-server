import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { crawlController } from '../controllers/crawlController.js';

const router = Router();

router.get('/', asyncHandler(crawlController));

export default router;
