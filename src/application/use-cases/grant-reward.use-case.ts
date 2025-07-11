import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  IDiscordService,
  CreateUserData,
  RewardType,
  RewardResult,
} from "../../domain";

/**
 * 보상 지급 유스케이스
 * 외부 의존성(Discord.js, Prisma)을 모르는 순수한 비즈니스 로직
 */
export class GrantRewardUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly levelRepository: ILevelRepository,
    private readonly rewardRepository: IRewardRepository,
    private readonly discordService: IDiscordService
  ) {}

  /**
   * 활동 기반 보상 지급 실행
   */
  async execute(
    discordId: string,
    username: string,
    globalName: string | null,
    channelId: string,
    eventType: RewardType,
    eventId?: number
  ): Promise<RewardResult> {
    try {
      // 1. 사용자 찾기 또는 생성
      const user = await this.userRepository.findOrCreate({
        discordId,
        username,
        globalName,
      });

      // 2. 채널 보상 설정 확인
      const channel =
        await this.rewardRepository.getRewardableChannel(channelId);
      if (!channel || !channel.isActive) {
        return {
          success: false,
          rewardAmount: 0,
          newTotalReward: user.currentReward,
          leveledUp: false,
        };
      }

      // 3. 보상 금액 계산
      const rewardAmount = this.calculateRewardAmount(channel, eventType);
      if (rewardAmount <= 0) {
        return {
          success: false,
          rewardAmount: 0,
          newTotalReward: user.currentReward,
          leveledUp: false,
        };
      }

      // 4. 보상 지급 및 기록
      const newTotalReward = user.currentReward + rewardAmount;
      const updatedUser = await this.userRepository.updatePoints(
        user.id,
        newTotalReward
      );

      await this.rewardRepository.createRewardHistory({
        discordUserId: user.id,
        amount: rewardAmount,
        type: eventType,
        reason: `${eventType} 활동 보상`,
        discordEventId: eventId,
      });

      // 5. 레벨 업 확인
      const oldLevel = user.currentLevel;
      const newLevel =
        await this.levelRepository.calculateLevelFromReward(newTotalReward);
      let assignedRoleId: string | undefined;

      if (newLevel > oldLevel) {
        // 레벨 업데이트
        await this.userRepository.updateLevel(user.id, newLevel);

        // 역할 부여
        const role = await this.levelRepository.getRoleForLevel(newLevel);
        if (role) {
          await this.discordService.assignRoleToUser(
            discordId,
            role.discordRoleId
          );
          assignedRoleId = role.discordRoleId;

          // 레벨 업 축하 메시지 (역할 이름 포함)
          await this.discordService.sendDirectMessage(
            discordId,
            `🎉 축하합니다! 레벨 ${newLevel}(${await this.getLevelName(newLevel)})에 도달했습니다!\n새로운 역할 **${role.roleName}**을 획득하셨습니다!`
          );
        }
      }

      return {
        success: true,
        rewardAmount,
        newTotalReward,
        leveledUp: newLevel > oldLevel,
        newLevel: newLevel > oldLevel ? newLevel : undefined,
        assignedRoleId,
      };
    } catch (error) {
      console.error("[GrantRewardUseCase] 보상 지급 실행 오류:", error);
      throw error;
    }
  }

  /**
   * 수동 보상 지급 실행
   */
  async executeManualReward(
    discordId: string,
    amount: number,
    reason: string
  ): Promise<RewardResult> {
    try {
      const user = await this.userRepository.findByDiscordId(discordId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      const newTotalReward = user.currentReward + amount;
      const updatedUser = await this.userRepository.updatePoints(
        user.id,
        newTotalReward
      );

      await this.rewardRepository.createRewardHistory({
        discordUserId: user.id,
        amount,
        type: "manual",
        reason,
      });

      // 레벨 업 확인
      const oldLevel = user.currentLevel;
      const newLevel =
        await this.levelRepository.calculateLevelFromReward(newTotalReward);
      let assignedRoleId: string | undefined;

      if (newLevel > oldLevel) {
        await this.userRepository.updateLevel(user.id, newLevel);

        const role = await this.levelRepository.getRoleForLevel(newLevel);
        if (role) {
          await this.discordService.assignRoleToUser(
            discordId,
            role.discordRoleId
          );
          assignedRoleId = role.discordRoleId;

          await this.discordService.sendDirectMessage(
            discordId,
            `🎉 축하합니다! 레벨 ${newLevel}(${await this.getLevelName(newLevel)})에 도달했습니다!\n새로운 역할 **${role.roleName}**을 획득하셨습니다!`
          );
        }
      }

      return {
        success: true,
        rewardAmount: amount,
        newTotalReward,
        leveledUp: newLevel > oldLevel,
        newLevel: newLevel > oldLevel ? newLevel : undefined,
        assignedRoleId,
      };
    } catch (error) {
      console.error("[GrantRewardUseCase] 수동 보상 지급 실행 오류:", error);
      throw error;
    }
  }

  /**
   * 채널과 이벤트 타입에 따른 보상 금액 계산
   */
  private calculateRewardAmount(channel: any, eventType: RewardType): number {
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
   * 레벨 이름 조회
   */
  private async getLevelName(levelNumber: number): Promise<string> {
    const level = await this.levelRepository.findByLevelNumber(levelNumber);
    return level?.levelName || `레벨 ${levelNumber}`;
  }
}
