import { Request, Response } from 'express';
import { friendRequestRepository } from '../repositories/friend-request.repository';
import { userRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const sendFriendRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const currentUserId = req.user!.userId;
  const { toUserId } = req.body;

  if (!toUserId || toUserId === currentUserId) {
    return res
      .status(400)
      .json({ success: false, message: 'Нельзя добавить себя в друзья' });
  }

  const toUser = await userRepository.findById(toUserId);
  if (!toUser) {
    return res
      .status(404)
      .json({ success: false, message: 'Пользователь не найден' });
  }

  const existing = await friendRequestRepository.findOneByConditions({
    fromUserId: currentUserId,
    toUserId,
    status: 'pending',
  });

  if (existing) {
    return res
      .status(409)
      .json({ success: false, message: 'Заявка уже существует' });
  }

  const request = await friendRequestRepository.createRequest(
    currentUserId,
    toUserId,
  );

  return res.status(201).json({ success: true, data: request });
};

export const getIncomingRequests = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const requests = await friendRequestRepository.findPendingToUser(userId);
  return res.json({ success: true, data: requests });
};

export const getOutgoingRequests = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const requests = await friendRequestRepository.findPendingFromUser(userId);
  return res.json({ success: true, data: requests });
};

export const acceptRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const { requestId } = req.params;

  const request = await friendRequestRepository.findById(requestId);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Заявка не найдена или уже обработана',
    });
  }

  const updated = await friendRequestRepository.acceptRequest(requestId);
  return res.json({ success: true, data: updated });
};

export const rejectRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user!.userId;
  const { requestId } = req.params;

  const request = await friendRequestRepository.findById(requestId);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Заявка не найдена или уже обработана',
    });
  }

  if (request.toUser.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Это не ваша заявка',
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Заявка уже обработана',
    });
  }

  await friendRequestRepository.delete(requestId);

  return res.json({
    success: true,
    message: 'Заявка отклонена',
  });
};

export const getFriends = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const friends = await friendRequestRepository.getFriends(userId);
  return res.json({ success: true, data: friends });
};

export const searchByUsername = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user!.userId;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const rawUsers = await userRepository.searchByUsername(
      currentUserId,
      q.trim(),
    );

    const users = rawUsers.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayname || null,
      avatarUrl: user.avatarurl,
      status: user.status,
      isOnline: user.isonline,
      isFriend: user.isfriend,
    }));

    return res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error('Ошибка поиска по username:', err);
    return res.status(500).json({ success: false, message: 'Ошибка поиска' });
  }
};

export const cancelOutgoingRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const request = await friendRequestRepository.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    if (request.fromUser.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Это не ваша заявка',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Заявка уже обработана',
      });
    }

    await friendRequestRepository.delete(requestId);

    return res.json({
      success: true,
      message: 'Заявка отменена',
    });
  } catch (err) {
    console.error('Ошибка отмены заявки:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};

export const removeFriend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ success: false, message: 'friendId обязателен' });
    }

    if (friendId === userId) {
      return res.status(400).json({ success: false, message: 'Нельзя удалить себя' });
    }

    const isFriend = await friendRequestRepository.isFriend(userId, friendId);

    if (!isFriend) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не в друзьях',
      });
    }

    await friendRequestRepository.removeFriendship(userId, friendId);

    return res.json({
      success: true,
      message: 'Пользователь удалён из друзей',
      removedFriendId: friendId,
    });
  } catch (err) {
    console.error('Ошибка удаления из друзей:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
};