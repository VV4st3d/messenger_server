import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';
import { getUserProfile, updateProfile } from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);
router.get('/:id', getUserProfile);
router.patch('/profile', updateProfile);

export default router;
