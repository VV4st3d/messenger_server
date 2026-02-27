import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload.middleware';
import {
  getUserProfile,
  updateAvatar,
  updateProfile,
} from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);
router.post('/avatar', uploadAvatar, updateAvatar);
router.get('/:id', getUserProfile);
router.patch('/profile', updateProfile);

export default router;
