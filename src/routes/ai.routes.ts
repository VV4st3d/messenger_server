import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { generateAiResponse } from '../controllers/ai.controller';

const router = Router();

router.use(authMiddleware);
router.post('/generate', generateAiResponse);

export default router;