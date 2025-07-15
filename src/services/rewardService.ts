import { prisma } from "../utils/prisma.js";
import { UserService } from "./userService.js";
import { RewardHistory, RewardableChannel, PrismaClient } from "@prisma/client";

// 2025년 7월 9일 오후 6:53분(KST) -> UTC 시간으로 변환 (KST는 UTC+9)
const DOUBLE_REWARD_CUTOFF_DATE = new Date("2025-07-09T09:53:00.000Z");

export class RewardService {
  /**
   * 보상 처리 (자동) - 날짜 기반 2배 보상 지원
   */
  static async processRewardWithDate(
    userId: number,
    channelId: string,
    eventType: string,
    messageCreatedAt: Date,
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
      const baseRewardAmount = this.calculateRewardAmount(channel, eventType);

      if (baseRewardAmount <= 0) {
        console.log(`[RewardService] 보상 금액이 0입니다: ${eventType}`);
        return;
      }

      // 댓글인 경우 일일 한도 확인
      if (eventType === "comment") {
        const dailyCommentReward = await this.getDailyCommentReward(userId);
        if (dailyCommentReward >= 15) {
          console.log(
            `[RewardService] 사용자 ${userId}는 오늘 댓글 보상 한도(15점)에 도달했습니다.`
          );
          return;
        }

        // 남은 한도 계산
        const remainingLimit = 5 - dailyCommentReward;
        if (baseRewardAmount > remainingLimit) {
          console.log(
            `[RewardService] 댓글 보상을 ${remainingLimit}점으로 조정합니다. (일일 한도)`
          );
        }
      }

      // 날짜 기반 2배 보상 적용
      const isDoubleReward = messageCreatedAt < DOUBLE_REWARD_CUTOFF_DATE;
      let finalRewardAmount = isDoubleReward
        ? baseRewardAmount * 2
        : baseRewardAmount;

      // 댓글인 경우 일일 한도에 맞춰 조정
      if (eventType === "comment") {
        const dailyCommentReward = await this.getDailyCommentReward(userId);
        const remainingLimit = 5 - dailyCommentReward;
        finalRewardAmount = Math.min(finalRewardAmount, remainingLimit);
      }

      const reason = isDoubleReward
        ? `${eventType} 활동 보상 (2배 적용)`
        : `${eventType} 활동 보상`;

      // 보상 지급
      await this.giveReward(
        userId,
        finalRewardAmount,
        eventType,
        reason,
        eventId
      );

      console.log(
        `[RewardService] 보상 지급 완료: 사용자 ${userId}, ${finalRewardAmount} 포인트 (${eventType}${isDoubleReward ? ", 2배 적용" : ""})`
      );
    } catch (error) {
      console.error("[RewardService] 보상 처리 오류:", error);
    }
  }

  /**
   * 보상 처리 (자동) - 기존 메서드 (호환성 유지)
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
      let rewardAmount = this.calculateRewardAmount(channel, eventType);

      if (rewardAmount <= 0) {
        console.log(`[RewardService] 보상 금액이 0입니다: ${eventType}`);
        return;
      }

      // 댓글인 경우 일일 한도 확인
      if (eventType === "comment") {
        const dailyCommentReward = await this.getDailyCommentReward(userId);
        if (dailyCommentReward >= 15) {
          console.log(
            `[RewardService] 사용자 ${userId}는 오늘 댓글 보상 한도(15점)에 도달했습니다.`
          );
          return;
        }

        // 남은 한도에 맞춰 조정
        const remainingLimit = 15 - dailyCommentReward;
        rewardAmount = Math.min(rewardAmount, remainingLimit);
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

  /**
   * 오늘 받은 댓글 보상 총액 조회
   */
  static async getDailyCommentReward(userId: number): Promise<number> {
    try {
      // 오늘 시작 시간 (UTC 기준)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // 내일 시작 시간
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 오늘 받은 댓글 보상 합계 계산
      const result = await prisma.rewardHistory.aggregate({
        where: {
          discordUserId: userId,
          type: "comment",
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return result._sum.amount || 0;
    } catch (error) {
      console.error("[RewardService] 일일 댓글 보상 조회 오류:", error);
      return 0;
    }
  }
}
