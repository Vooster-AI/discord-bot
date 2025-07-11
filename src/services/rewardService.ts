import { prisma } from "../utils/prisma";
import { UserService } from "./userService";
import { RewardHistory, RewardableChannel, PrismaClient } from "@prisma/client";

export class RewardService {
  /**
   * 보상 처리 (자동)
   */
  static async processReward(
    userId: number,
    channelId: string,
    eventType: string,
    eventId?: number
  ): Promise<void> {
    try {
      // 해당 채널이 보상 대상인지 확인
      const channel = await prisma.rewardableChannel.findUnique({
        where: { channelId },
      });

      if (!channel || !channel.isActive) {
        console.log(`[RewardService] 보상 대상 채널이 아닙니다: ${channelId}`);
        return;
      }

      // 이벤트 타입에 따른 보상 금액 계산
      const rewardAmount = this.calculateRewardAmount(channel, eventType);

      if (rewardAmount <= 0) {
        console.log(`[RewardService] 보상 금액이 0입니다: ${eventType}`);
        return;
      }

      // 보상 지급
      await this.giveReward(
        userId,
        rewardAmount,
        eventType,
        `${eventType} 활동 보상`,
        eventId
      );

      console.log(
        `[RewardService] 보상 지급 완료: 사용자 ${userId}, ${rewardAmount} 포인트 (${eventType})`
      );
    } catch (error) {
      console.error("[RewardService] 보상 처리 오류:", error);
    }
  }

  /**
   * 보상 지급 (수동/자동)
   */
  static async giveReward(
    userId: number,
    amount: number,
    type: string,
    reason?: string,
    eventId?: number
  ): Promise<void> {
    try {
      // 트랜잭션으로 보상 지급과 기록을 동시에 처리
      await prisma.$transaction(async (tx) => {
        // 사용자 보상 업데이트
        await tx.discordUser.update({
          where: { id: userId },
          data: {
            currentReward: {
              increment: amount,
            },
          },
        });

        // 보상 기록 생성
        await tx.rewardHistory.create({
          data: {
            discordUserId: userId,
            amount,
            type,
            reason,
            discordEventId: eventId,
          },
        });
      });

      // 레벨 업 확인
      const user = await prisma.discordUser.findUnique({
        where: { id: userId },
      });

      if (user) {
        await UserService.checkLevelUp(user);
      }
    } catch (error) {
      console.error("[RewardService] 보상 지급 오류:", error);
      throw error;
    }
  }

  /**
   * 채널과 이벤트 타입에 따른 보상 금액 계산
   */
  static calculateRewardAmount(
    channel: RewardableChannel,
    eventType: string
  ): number {
    switch (eventType) {
      case "message":
        return channel.messageRewardAmount || 0;
      case "comment":
        return channel.commentRewardAmount || 0;
      case "forum_post":
        return channel.forumPostRewardAmount || 0;
      default:
        return 0;
    }
  }

  /**
   * 사용자 보상 기록 조회
   */
  static async getRewardHistory(
    userId: number,
    limit: number = 10
  ): Promise<RewardHistory[]> {
    try {
      const history = await prisma.rewardHistory.findMany({
        where: { discordUserId: userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          event: true,
        },
      });

      return history;
    } catch (error) {
      console.error("[RewardService] 보상 기록 조회 오류:", error);
      return [];
    }
  }

  /**
   * 특정 채널의 보상 통계 조회
   */
  static async getChannelRewardStats(channelId: string): Promise<{
    totalRewards: number;
    totalUsers: number;
    rewardsByType: { [key: string]: number };
  }> {
    try {
      const events = await prisma.discordEvent.findMany({
        where: { channelId },
        include: {
          rewardHistory: true,
        },
      });

      const totalRewards = events.reduce(
        (sum, event) => sum + (event.rewardHistory?.amount || 0),
        0
      );

      const uniqueUsers = new Set(events.map((event) => event.discordUserId));
      const totalUsers = uniqueUsers.size;

      const rewardsByType: { [key: string]: number } = {};
      events.forEach((event) => {
        if (event.rewardHistory) {
          rewardsByType[event.eventType] =
            (rewardsByType[event.eventType] || 0) + event.rewardHistory.amount;
        }
      });

      return {
        totalRewards,
        totalUsers,
        rewardsByType,
      };
    } catch (error) {
      console.error("[RewardService] 채널 보상 통계 조회 오류:", error);
      return {
        totalRewards: 0,
        totalUsers: 0,
        rewardsByType: {},
      };
    }
  }

  /**
   * 보상 대상 채널 설정
   */
  static async setRewardableChannel(
    channelId: string,
    channelName: string,
    messageReward: number = 0,
    commentReward: number = 0,
    forumPostReward: number = 0
  ): Promise<void> {
    try {
      await prisma.rewardableChannel.upsert({
        where: { channelId },
        create: {
          channelId,
          channelName,
          messageRewardAmount: messageReward,
          commentRewardAmount: commentReward,
          forumPostRewardAmount: forumPostReward,
          isActive: true,
        },
        update: {
          channelName,
          messageRewardAmount: messageReward,
          commentRewardAmount: commentReward,
          forumPostRewardAmount: forumPostReward,
          isActive: true,
        },
      });

      console.log(
        `[RewardService] 보상 채널 설정 완료: ${channelName} (${channelId})`
      );
    } catch (error) {
      console.error("[RewardService] 보상 채널 설정 오류:", error);
      throw error;
    }
  }

  /**
   * 보상 대상 채널 조회
   */
  static async getRewardableChannels(): Promise<any[]> {
    try {
      const channels = await prisma.rewardableChannel.findMany({
        where: { isActive: true },
        orderBy: { channelName: "asc" },
      });

      return channels;
    } catch (error) {
      console.error("[RewardService] 보상 채널 조회 오류:", error);
      return [];
    }
  }
}
