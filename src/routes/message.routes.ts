import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  sendMessage,
  getMessages,
  searchMessagesGlobal,
  searchMessagesInChat,
  getMessageContext,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from '../controllers/message.controller';

const router = Router();

router.use(authMiddleware);

router.get('/:chatId/search', searchMessagesInChat);

router.get('/search', searchMessagesGlobal);

router.post('/', sendMessage);
router.get('/:chatId', getMessages);
router.get('/:messageId/context', getMessageContext);

router.post('/:messageId/pin', pinMessage);
router.post('/:messageId/unpin', unpinMessage);
router.get('/:chatId/pinned', getPinnedMessages);

export default router;
