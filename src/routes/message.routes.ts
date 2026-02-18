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
  uploadMedia,
  deleteMessage,
} from '../controllers/message.controller';
import multer from 'multer';
const upload = multer({ dest: 'uploads/temp/' });

const router = Router();

router.use(authMiddleware);

router.get('/:chatId/search', searchMessagesInChat);

router.get('/search', searchMessagesGlobal);

router.post('/', sendMessage);
router.get('/:chatId', getMessages);
router.get('/:messageId/context', getMessageContext);
router.post('/upload', authMiddleware, ...uploadMedia);

router.post('/:messageId/pin', pinMessage);
router.post('/:messageId/unpin', unpinMessage);
router.get('/:chatId/pinned', getPinnedMessages);
router.delete('/:messageId', deleteMessage);

export default router;
