import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createOrGetPrivateChat,
  getUserChats,
  getChatById,
  createGroupChat,
} from '../controllers/chat.controller';

const router = Router();

router.use(authMiddleware);

router.post('/private', createOrGetPrivateChat);
router.get('/', getUserChats);
router.get('/:id', getChatById);
router.post('/group', createGroupChat);

export default router;
