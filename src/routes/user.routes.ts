import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';
import { updateAvatar } from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);
router.post('/avatar', uploadAvatar, updateAvatar);

export default router;