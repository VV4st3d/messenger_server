import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { generateAiSummary } from '../controllers/ai.controller';

const router = Router();

router.use(authMiddleware);
router.get('/:messageId/summary', generateAiSummary);

export default router;
