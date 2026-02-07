import { Request, Response } from "express";
import { friendRequestRepository } from "../repositories/friend-request.repository";
import { userRepository } from "../repositories/user.repository";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export const sendFriendRequest = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const currentUserId = req.user!.userId;
    const { toUserId } = req.body;

    if (!toUserId || toUserId === currentUserId) {
        return res
            .status(400)
            .json({ success: false, message: "Нельзя добавить себя в друзья" });
    }

    const toUser = await userRepository.findById(toUserId);
    if (!toUser) {
        return res
            .status(404)
            .json({ success: false, message: "Пользователь не найден" });
    }

    const existing = await friendRequestRepository.findOneByConditions({
        fromUserId: currentUserId,
        toUserId,
        status: "pending",
    });

    if (existing) {
        return res
            .status(409)
            .json({ success: false, message: "Заявка уже существует" });
    }

    const request = await friendRequestRepository.createRequest(
        currentUserId,
        toUserId
    );

    return res.status(201).json({ success: true, data: request });
};

export const getIncomingRequests = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user!.userId;
    const requests = await friendRequestRepository.findPendingToUser(userId);
    return res.json({ success: true, data: requests });
};

export const getOutgoingRequests = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user!.userId;
    const requests = await friendRequestRepository.findPendingFromUser(userId);
    return res.json({ success: true, data: requests });
};

export const acceptRequest = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const request = await friendRequestRepository.findById(requestId);

    if (!request) {
        return res
            .status(404)
            .json({
                success: false,
                message: "Заявка не найдена или уже обработана",
            });
    }

    const updated = await friendRequestRepository.acceptRequest(requestId);
    return res.json({ success: true, data: updated });
};

export const rejectRequest = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const request = await friendRequestRepository.findById(requestId);

    if (!request) {
        return res
            .status(404)
            .json({
                success: false,
                message: "Заявка не найдена или уже обработана",
            });
    }

    const updated = await friendRequestRepository.rejectRequest(requestId);
    return res.json({ success: true, data: updated });
};

export const getFriends = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const friends = await friendRequestRepository.getFriends(userId);
    return res.json({ success: true, data: friends });
};
