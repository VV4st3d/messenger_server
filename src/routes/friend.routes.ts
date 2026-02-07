import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  sendFriendRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
} from '../controllers/friend.controller';

const router = Router();

router.use(authMiddleware);

router.post('/request', sendFriendRequest);
router.get('/incoming', getIncomingRequests);
router.get('/outgoing', getOutgoingRequests);
router.post('/accept/:requestId', acceptRequest);
router.post('/reject/:requestId', rejectRequest);
router.get('/', getFriends);

export default router;