import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createOrGetPrivateChat, getUserChats, getChatById } from '../controllers/chat.controller';

const router = Router();

router.use(authMiddleware);

router.post('/private', createOrGetPrivateChat);
router.get('/', getUserChats);
router.get('/:id', getChatById);

export default router;