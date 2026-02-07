import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { checkEmail } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/check-email', checkEmail);
router.get('/me', authMiddleware, getCurrentUser);

export default router;