import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getUserProfile,
  updateProfile,
  uploadProfilePhoto,
} from '../controllers/user.controller';

const router = Router();

router.use(authMiddleware);
router.get('/:id', getUserProfile);
router.patch('/profile', updateProfile);
router.post('/profile/photo', uploadProfilePhoto);

export default router;
