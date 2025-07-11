import { prisma } from "../utils/prisma.js";
import { Level, DiscordRole } from "@prisma/client";
import { client } from "../bot/index.js";
import { DISCORD_GUILD_ID } from "../config.js";

export class LevelService {
  /**
   * 보상 포인트를 기반으로 레벨 계산
   */
  static async calculateLevelFromReward(totalReward: number): Promise<number> {
    try {
      const level = await prisma.level.findFirst({
        where: {
          requiredRewardAmount: { lte: totalReward },
        },
        orderBy: {
          levelNumber: "desc",
        },
      });

      return level?.levelNumber || 1;
    } catch (error) {
      console.error("[LevelService] 레벨 계산 오류:", error);
      return 1;
    }
  }

  /**
   * 현재 레벨 정보 조회
   */
  static async getCurrentLevel(totalReward: number): Promise<Level | null> {
    try {
      const level = await prisma.level.findFirst({
        where: {
          requiredRewardAmount: { lte: totalReward },
        },
        orderBy: {
          levelNumber: "desc",
        },
        include: {
          role: true,
        },
      });

      return level;
    } catch (error) {
      console.error("[LevelService] 현재 레벨 조회 오류:", error);
      return null;
    }
  }

  /**
   * 다음 레벨 정보 조회
   */
  static async getNextLevel(currentLevel: number): Promise<Level | null> {
    try {
      const nextLevel = await prisma.level.findFirst({
        where: {
          levelNumber: currentLevel + 1,
        },
        include: {
          role: true,
        },
      });

      return nextLevel;
    } catch (error) {
      console.error("[LevelService] 다음 레벨 조회 오류:", error);
      return null;
    }
  }

  /**
   * 특정 레벨에 따른 역할 부여
   */
  static async assignRoleForLevel(
    discordId: string,
    levelNumber: number
  ): Promise<void> {
    try {
      const level = await prisma.level.findUnique({
        where: { levelNumber },
        include: { role: true },
      });

      if (!level || !level.role) {
        console.log(
          `[LevelService] 레벨 ${levelNumber}에 대한 역할이 없습니다.`
        );
        return;
      }

      await this.assignDiscordRole(discordId, level.role.discordRoleId);
    } catch (error) {
      console.error("[LevelService] 레벨 역할 부여 오류:", error);
    }
  }

  /**
   * Discord 역할 부여
   */
  static async assignDiscordRole(
    discordId: string,
    roleId: string
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
      const member = await guild.members.fetch(discordId);

      if (!member) {
        console.error(`[LevelService] 사용자를 찾을 수 없습니다: ${discordId}`);
        return;
      }

      // 이미 역할을 가지고 있는지 확인
      if (member.roles.cache.has(roleId)) {
        console.log(
          `[LevelService] 사용자가 이미 역할을 가지고 있습니다: ${member.user.username}`
        );
        return;
      }

      // 역할 정보 가져오기
      const role = await guild.roles.fetch(roleId);
      const roleName = role?.name || "알 수 없는 역할";

      await member.roles.add(roleId);
      console.log(
        `[LevelService] 역할 부여 완료: ${member.user.username} → ${roleName} (${roleId})`
      );

      // 사용자에게 DM 전송 (역할 이름 포함)
      try {
        await member.send(
          `🎉 축하합니다! 새로운 역할 **${roleName}**을 획득하셨습니다!`
        );
      } catch (dmError) {
        console.warn(`[LevelService] DM 전송 실패: ${member.user.username}`);
      }
    } catch (error) {
      console.error(
        `[LevelService] Discord 역할 부여 오류 (${discordId}, ${roleId}):`,
        error
      );
    }
  }

  /**
   * 레벨 진행률 계산
   */
  static async calculateProgress(
    currentReward: number,
    currentLevel: number
  ): Promise<{
    currentLevelReward: number;
    nextLevelReward: number;
    progress: number;
    progressPercentage: number;
  }> {
    try {
      const currentLevelData = await prisma.level.findUnique({
        where: { levelNumber: currentLevel },
      });

      const nextLevelData = await prisma.level.findUnique({
        where: { levelNumber: currentLevel + 1 },
      });

      if (!currentLevelData) {
        return {
          currentLevelReward: 0,
          nextLevelReward: 0,
          progress: 0,
          progressPercentage: 0,
        };
      }

      const currentLevelReward = currentLevelData.requiredRewardAmount;
      const nextLevelReward =
        nextLevelData?.requiredRewardAmount || currentLevelReward;
      const progress = currentReward - currentLevelReward;
      const progressPercentage = nextLevelData
        ? Math.min(
            (progress / (nextLevelReward - currentLevelReward)) * 100,
            100
          )
        : 100;

      return {
        currentLevelReward,
        nextLevelReward,
        progress,
        progressPercentage,
      };
    } catch (error) {
      console.error("[LevelService] 레벨 진행률 계산 오류:", error);
      return {
        currentLevelReward: 0,
        nextLevelReward: 0,
        progress: 0,
        progressPercentage: 0,
      };
    }
  }

  /**
   * 모든 레벨 정보 조회
   */
  static async getAllLevels(): Promise<Level[]> {
    try {
      const levels = await prisma.level.findMany({
        orderBy: { levelNumber: "asc" },
        include: { role: true },
      });

      return levels;
    } catch (error) {
      console.error("[LevelService] 전체 레벨 조회 오류:", error);
      return [];
    }
  }
}
