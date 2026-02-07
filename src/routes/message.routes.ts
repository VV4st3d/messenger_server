import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  sendMessage,
  getMessages,
  searchMessagesGlobal,
  searchMessagesInChat,
  getMessageContext,
} from '../controllers/message.controller';

const router = Router();

router.use(authMiddleware);

router.get('/:chatId/search', searchMessagesInChat);

router.get('/search', searchMessagesGlobal);

router.post('/', sendMessage);
router.get('/:chatId', getMessages);
router.get('/:messageId/context', getMessageContext);

export default router;
