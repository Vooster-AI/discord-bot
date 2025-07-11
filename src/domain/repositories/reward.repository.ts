import {
  RewardHistory,
  RewardableChannel,
  RewardType,
  ChannelRewardSettings,
} from "../entities/reward.entity";

/**
 * 보상 저장소 인터페이스
 */
export interface IRewardRepository {
  /**
   * 보상 기록 생성
   */
  createRewardHistory(data: {
    discordUserId: number;
    amount: number;
    type: RewardType;
    reason?: string;
    discordEventId?: number;
  }): Promise<RewardHistory>;

  /**
   * 사용자 보상 기록 조회
   */
  getRewardHistory(userId: number, limit: number): Promise<RewardHistory[]>;

  /**
   * 채널 보상 설정 조회
   */
  getRewardableChannel(channelId: string): Promise<RewardableChannel | null>;

  /**
   * 보상 가능한 채널 목록 조회
   */
  getRewardableChannels(): Promise<RewardableChannel[]>;

  /**
   * 채널 보상 설정 저장/업데이트
   */
  upsertRewardableChannel(
    settings: ChannelRewardSettings
  ): Promise<RewardableChannel>;

  /**
   * 채널 보상 통계 조회
   */
  getChannelRewardStats(channelId: string): Promise<{
    totalRewards: number;
    totalUsers: number;
    rewardsByType: { [key: string]: number };
  }>;
}
