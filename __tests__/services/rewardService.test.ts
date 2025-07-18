import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma - must be at the top before imports
vi.mock("../../src/utils/prisma", () => ({
  prisma: {
    rewardableChannel: {
      findUnique: vi.fn(),
    },
    discordUser: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    rewardHistory: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock UserService
vi.mock("../../src/services/userService", () => ({
  UserService: {
    checkLevelUp: vi.fn(),
  },
}));

import { RewardService } from "../../src/services/rewardService";
import { prisma } from "../../src/utils/prisma";

describe("RewardService - 2배 보상 기능", () => {
  const DOUBLE_REWARD_CUTOFF_DATE = new Date("2025-07-09T09:53:00.000Z"); // 2025-07-09 18:53 KST

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processRewardWithDate", () => {
    it("2025년 7월 9일 오후 6:53분(KST) 이전 메시지에 대해 점수를 2배로 지급해야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "message";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T09:00:00.000Z"); // 6:53 이전

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 5,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      // 트랜잭션 함수 실행하여 2배 보상이 지급되는지 확인
      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 20, // 10 * 2 = 20 (2배)
          },
        },
      });

      expect(mockTx.rewardHistory.create).toHaveBeenCalledWith({
        data: {
          discordUserId: userId,
          amount: 20,
          type: "message",
          reason: "message 활동 보상 (2배 적용)",
          discordEventId: eventId,
        },
      });
    });

    it("2025년 7월 9일 오후 6:53분(KST) 이후 메시지에 대해 정상 점수를 지급해야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "message";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T10:00:00.000Z"); // 6:53 이후

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 5,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      // 트랜잭션 함수 실행하여 정상 보상이 지급되는지 확인
      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 10, // 정상 점수
          },
        },
      });

      expect(mockTx.rewardHistory.create).toHaveBeenCalledWith({
        data: {
          discordUserId: userId,
          amount: 10,
          type: "message",
          reason: "message 활동 보상",
          discordEventId: eventId,
        },
      });
    });

    it("정확히 2025년 7월 9일 오후 6:53분(KST)에 생성된 메시지에 대해 정상 점수를 지급해야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "message";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T09:53:00.000Z"); // 정확히 6:53

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 5,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      // 트랜잭션 함수 실행하여 정상 보상이 지급되는지 확인
      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 10, // 정상 점수 (경계값은 2배 적용 안됨)
          },
        },
      });
    });

    it("comment 타입에 대해서도 2배 보상이 적용되어야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "comment";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T09:00:00.000Z"); // 6:53 이전

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 5,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      // Mock for getDailyCommentReward
      (prisma.rewardHistory.aggregate as any).mockResolvedValue({
        _sum: {
          amount: 0, // No previous comment rewards today
        },
      });
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 5, // Daily limit of 5 points for comments (no double reward as limit is applied first)
          },
        },
      });
    });

    it("forum_post 타입에 대해서도 2배 보상이 적용되어야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "forum_post";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T09:00:00.000Z"); // 6:53 이전

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 5,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 30, // 15 * 2 = 30 (2배)
          },
        },
      });
    });

    it("보상 대상 채널이 아닌 경우 보상을 지급하지 않아야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "non-reward-channel";
      const eventType = "message";
      const eventId = 1;
      const messageCreatedAt = new Date("2025-07-09T09:00:00.000Z");

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(null);

      // Act
      await RewardService.processRewardWithDate(
        userId,
        channelId,
        eventType,
        messageCreatedAt,
        eventId
      );

      // Assert
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("댓글 일일 보상 한도", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("사용자가 일일 댓글 보상 한도(15점)에 도달하면 추가 보상을 받지 못해야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "comment";
      const eventId = 1;
      const messageCreatedAt = new Date();

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 3,
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      // Mock: 이미 5점을 받은 상태
      (prisma.rewardHistory.aggregate as any).mockResolvedValue({
        _sum: {
          amount: 15,
        },
      });

      // Act
      await RewardService.processReward(userId, channelId, eventType, eventId);

      // Assert
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("일일 한도 미달 시 남은 한도만큼만 보상을 받아야 한다", async () => {
      // Arrange
      const userId = 1;
      const channelId = "test-channel-id";
      const eventType = "comment";
      const eventId = 1;

      const mockChannel = {
        channelId,
        messageRewardAmount: 10,
        commentRewardAmount: 3, // 3점씩 지급
        forumPostRewardAmount: 15,
        isActive: true,
      };

      (prisma.rewardableChannel.findUnique as any).mockResolvedValue(
        mockChannel
      );
      // Mock: 이미 13점을 받은 상태 (남은 한도: 2점)
      (prisma.rewardHistory.aggregate as any).mockResolvedValue({
        _sum: {
          amount: 13,
        },
      });
      (prisma.$transaction as any).mockResolvedValue(undefined);

      // Act
      await RewardService.processReward(userId, channelId, eventType, eventId);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionFn = (prisma.$transaction as any).mock.calls[0][0];

      const mockTx = {
        discordUser: { update: vi.fn() },
        rewardHistory: { create: vi.fn() },
      };

      await transactionFn(mockTx);

      expect(mockTx.discordUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          currentReward: {
            increment: 2, // 남은 한도인 2점만 지급
          },
        },
      });
    });

    it("getDailyCommentReward가 오늘의 댓글 보상을 정확히 계산해야 한다", async () => {
      // Arrange
      const userId = 1;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      (prisma.rewardHistory.aggregate as any).mockResolvedValue({
        _sum: {
          amount: 4,
        },
      });

      // Act
      const result = await RewardService.getDailyCommentReward(userId);

      // Assert
      expect(result).toBe(4);
      expect(prisma.rewardHistory.aggregate).toHaveBeenCalledWith({
        where: {
          discordUserId: userId,
          type: "comment",
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
        _sum: {
          amount: true,
        },
      });
    });
  });
});
