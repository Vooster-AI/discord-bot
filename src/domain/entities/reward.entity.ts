/**
 * 보상 기록 엔티티
 */
export interface RewardHistory {
  id: number;
  discordUserId: number;
  amount: number;
  type: RewardType;
  reason: string | null;
  discordEventId: number | null;
  createdAt: Date;
}

/**
 * 보상 가능한 채널 엔티티
 */
export interface RewardableChannel {
  id: number;
  channelId: string;
  channelName: string | null;
  messageRewardAmount: number;
  commentRewardAmount: number;
  forumPostRewardAmount: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * 보상 유형
 */
export type RewardType = "message" | "comment" | "forum_post" | "manual";

/**
 * 보상 처리 결과
 */
export interface RewardResult {
  success: boolean;
  rewardAmount: number;
  newTotalReward: number;
  leveledUp: boolean;
  newLevel?: number;
  assignedRoleId?: string;
}

/**
 * 채널 보상 설정
 */
export interface ChannelRewardSettings {
  channelId: string;
  channelName: string;
  messageReward: number;
  commentReward: number;
  forumPostReward: number;
}
