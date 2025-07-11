import { PrismaClient } from "@prisma/client";
import {
  IRewardRepository,
  RewardHistory,
  RewardableChannel,
  RewardType,
  ChannelRewardSettings,
} from "../../domain";

/**
 * Prisma를 사용한 보상 저장소 구현체
 */
export class PrismaRewardRepository implements IRewardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 보상 기록 생성
   */
  async createRewardHistory(data: {
    discordUserId: number;
    amount: number;
    type: RewardType;
    reason?: string;
    discordEventId?: number;
  }): Promise<RewardHistory> {
    const rewardHistory = await this.prisma.rewardHistory.create({
      data: {
        discordUserId: data.discordUserId,
        amount: data.amount,
        type: data.type,
        reason: data.reason,
        discordEventId: data.discordEventId,
      },
    });

    return this.mapToRewardHistory(rewardHistory);
  }

  /**
   * 사용자 보상 기록 조회
   */
  async getRewardHistory(
    userId: number,
    limit: number
  ): Promise<RewardHistory[]> {
    const rewards = await this.prisma.rewardHistory.findMany({
      where: { discordUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rewards.map((reward) => this.mapToRewardHistory(reward));
  }

  /**
   * 채널 보상 설정 조회
   */
  async getRewardableChannel(
    channelId: string
  ): Promise<RewardableChannel | null> {
    const channel = await this.prisma.rewardableChannel.findUnique({
      where: { channelId },
    });

    return channel ? this.mapToRewardableChannel(channel) : null;
  }

  /**
   * 보상 가능한 채널 목록 조회
   */
  async getRewardableChannels(): Promise<RewardableChannel[]> {
    const channels = await this.prisma.rewardableChannel.findMany({
      where: { isActive: true },
      orderBy: { channelName: "asc" },
    });

    return channels.map((channel) => this.mapToRewardableChannel(channel));
  }

  /**
   * 채널 보상 설정 저장/업데이트
   */
  async upsertRewardableChannel(
    settings: ChannelRewardSettings
  ): Promise<RewardableChannel> {
    const channel = await this.prisma.rewardableChannel.upsert({
      where: { channelId: settings.channelId },
      create: {
        channelId: settings.channelId,
        channelName: settings.channelName,
        messageRewardAmount: settings.messageReward,
        commentRewardAmount: settings.commentReward,
        forumPostRewardAmount: settings.forumPostReward,
        isActive: true,
      },
      update: {
        channelName: settings.channelName,
        messageRewardAmount: settings.messageReward,
        commentRewardAmount: settings.commentReward,
        forumPostRewardAmount: settings.forumPostReward,
        isActive: true,
      },
    });

    return this.mapToRewardableChannel(channel);
  }

  /**
   * 채널 보상 통계 조회
   */
  async getChannelRewardStats(channelId: string): Promise<{
    totalRewards: number;
    totalUsers: number;
    rewardsByType: { [key: string]: number };
  }> {
    // 이 메서드는 복잡한 집계 쿼리가 필요하므로 간단한 버전으로 구현
    const events = await this.prisma.discordEvent.findMany({
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
  }

  /**
   * Prisma 모델을 도메인 엔티티로 변환
   */
  private mapToRewardHistory(prismaReward: any): RewardHistory {
    return {
      id: prismaReward.id,
      discordUserId: prismaReward.discordUserId,
      amount: prismaReward.amount,
      type: prismaReward.type as RewardType,
      reason: prismaReward.reason,
      discordEventId: prismaReward.discordEventId,
      createdAt: prismaReward.createdAt,
    };
  }

  /**
   * Prisma 모델을 도메인 엔티티로 변환
   */
  private mapToRewardableChannel(prismaChannel: any): RewardableChannel {
    return {
      id: prismaChannel.id,
      channelId: prismaChannel.channelId,
      channelName: prismaChannel.channelName,
      messageRewardAmount: prismaChannel.messageRewardAmount,
      commentRewardAmount: prismaChannel.commentRewardAmount,
      forumPostRewardAmount: prismaChannel.forumPostRewardAmount,
      isActive: prismaChannel.isActive,
      createdAt: prismaChannel.createdAt,
    };
  }
}
