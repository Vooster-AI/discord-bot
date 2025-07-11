/**
 * 레벨 도메인 엔티티
 */
export interface Level {
  id: number;
  levelNumber: number;
  requiredRewardAmount: number;
  levelName: string;
  discordRoleTableId: number | null;
  createdAt: Date;
}

/**
 * Discord 역할 엔티티
 */
export interface DiscordRole {
  id: number;
  discordRoleId: string;
  roleName: string;
  description: string | null;
  createdAt: Date;
}

/**
 * 레벨 진행률 정보
 */
export interface LevelProgress {
  currentLevelReward: number;
  nextLevelReward: number;
  progress: number;
  progressPercentage: number;
}
