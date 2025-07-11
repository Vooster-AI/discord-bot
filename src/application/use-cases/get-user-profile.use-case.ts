import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  User,
  LevelProgress,
  RewardHistory,
} from "../../domain";

/**
 * 사용자 프로필 데이터
 */
export interface UserProfile {
  user: User;
  levelProgress: LevelProgress;
  nextLevelName?: string;
  recentRewards: RewardHistory[];
}

/**
 * 사용자 프로필 조회 유스케이스
 */
export class GetUserProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly levelRepository: ILevelRepository,
    private readonly rewardRepository: IRewardRepository
  ) {}

  /**
   * 사용자 프로필 조회 실행
   */
  async execute(discordId: string): Promise<UserProfile | null> {
    try {
      // 1. 사용자 조회
      const user = await this.userRepository.findByDiscordId(discordId);
      if (!user) {
        return null;
      }

      // 2. 레벨 진행률 계산
      const levelProgress = await this.levelRepository.calculateProgress(
        user.currentReward,
        user.currentLevel
      );

      // 3. 다음 레벨 이름 조회
      const nextLevel = await this.levelRepository.getNextLevel(
        user.currentLevel
      );
      const nextLevelName = nextLevel?.levelName;

      // 4. 최근 보상 기록 조회
      const recentRewards = await this.rewardRepository.getRewardHistory(
        user.id,
        5
      );

      return {
        user,
        levelProgress,
        nextLevelName,
        recentRewards,
      };
    } catch (error) {
      console.error("[GetUserProfileUseCase] 사용자 프로필 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 리더보드 조회 실행
   */
  async getLeaderboard(limit: number = 10): Promise<User[]> {
    try {
      return await this.userRepository.getTopUsers(limit);
    } catch (error) {
      console.error("[GetUserProfileUseCase] 리더보드 조회 오류:", error);
      throw error;
    }
  }
}
