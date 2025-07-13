import { prisma } from "../utils/prisma.js";
import { DiscordUser } from "@prisma/client";
import { LevelService } from "./levelService.js";

export class UserService {
  /**
   * Discord 사용자 정보를 찾거나 새로 생성
   */
  static async findOrCreateUser(
    discordId: string,
    userData: {
      username: string;
      globalName?: string | null;
      discriminator?: string | null;
      avatarUrl?: string | null;
    }
  ): Promise<DiscordUser> {
    try {
      // 기존 사용자 찾기
      let user = await prisma.discordUser.findUnique({
        where: { discordId },
      });

      if (!user) {
        // 새 사용자 생성
        user = await prisma.discordUser.create({
          data: {
            discordId,
            username: userData.username,
            globalName: userData.globalName,
            discriminator: userData.discriminator,
            avatarUrl: userData.avatarUrl,
          },
        });
        console.log(
          `[UserService] 새 사용자 생성: ${userData.username} (${discordId})`
        );
      } else {
        // 기존 사용자 정보 업데이트
        user = await prisma.discordUser.update({
          where: { discordId },
          data: {
            username: userData.username,
            globalName: userData.globalName,
            discriminator: userData.discriminator,
            avatarUrl: userData.avatarUrl,
          },
        });
      }

      return user;
    } catch (error) {
      console.error("[UserService] 사용자 찾기/생성 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 데이터 조회
   */
  static async getUserData(discordId: string): Promise<DiscordUser | null> {
    try {
      const user = await prisma.discordUser.findUnique({
        where: { discordId },
      });

      return user;
    } catch (error) {
      console.error("[UserService] 사용자 데이터 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 랭킹 조회
   */
  static async getUserRanking(discordId: string): Promise<{
    rank: number;
    totalUsers: number;
    percentile: number;
  } | null> {
    try {
      const user = await prisma.discordUser.findUnique({
        where: { discordId },
      });

      if (!user) {
        return null;
      }

      // 현재 사용자보다 점수가 높은 사용자 수 조회
      const higherScoreUsers = await prisma.discordUser.count({
        where: {
          currentReward: {
            gt: user.currentReward,
          },
        },
      });

      // 전체 사용자 수 조회
      const totalUsers = await prisma.discordUser.count();

      // 랭킹 계산 (1위부터 시작)
      const rank = higherScoreUsers + 1;

      // 백분위 계산 (상위 몇 퍼센트인지)
      const percentile = Math.round(
        ((totalUsers - rank + 1) / totalUsers) * 100
      );

      return {
        rank,
        totalUsers,
        percentile,
      };
    } catch (error) {
      console.error("[UserService] 사용자 랭킹 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 리워드 내역 조회
   */
  static async getUserRewardHistory(
    discordId: string,
    limit: number = 5
  ): Promise<
    Array<{
      id: number;
      amount: number;
      type: string;
      reason: string | null;
      createdAt: Date;
      event: {
        channelId: string;
        content: string | null;
        eventType: string;
      } | null;
    }>
  > {
    try {
      // 먼저 사용자 찾기
      const user = await prisma.discordUser.findUnique({
        where: { discordId },
      });

      if (!user) {
        return [];
      }

      // 리워드 내역 조회
      const rewardHistory = await prisma.rewardHistory.findMany({
        where: { discordUserId: user.id },
        include: {
          event: {
            select: {
              channelId: true,
              content: true,
              eventType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return rewardHistory.map((reward) => ({
        id: reward.id,
        amount: reward.amount,
        type: reward.type,
        createdAt: reward.createdAt,
        event: reward.event,
        reason: reward.reason,
      }));
    } catch (error) {
      console.error("[UserService] 리워드 내역 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 보상 업데이트
   */
  static async updateUserReward(
    userId: number,
    amount: number
  ): Promise<DiscordUser> {
    try {
      const user = await prisma.discordUser.update({
        where: { id: userId },
        data: {
          currentReward: {
            increment: amount,
          },
        },
      });

      // 레벨 업 확인
      await this.checkLevelUp(user);

      return user;
    } catch (error) {
      console.error("[UserService] 사용자 보상 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 레벨 업 확인 및 처리
   */
  static async checkLevelUp(user: DiscordUser): Promise<void> {
    try {
      const newLevel = await LevelService.calculateLevelFromReward(
        user.currentReward
      );

      if (newLevel > user.currentLevel) {
        await prisma.discordUser.update({
          where: { id: user.id },
          data: { currentLevel: newLevel },
        });

        // 역할 부여
        await LevelService.assignRoleForLevel(user.discordId, newLevel);

        console.log(
          `[UserService] 레벨 업: ${user.username} (${user.currentLevel} → ${newLevel})`
        );
      }
    } catch (error) {
      console.error("[UserService] 레벨 업 확인 오류:", error);
      throw error;
    }
  }

  /**
   * 리더보드 조회
   */
  static async getLeaderboard(limit: number = 10): Promise<DiscordUser[]> {
    try {
      const users = await prisma.discordUser.findMany({
        orderBy: [{ currentReward: "desc" }, { currentLevel: "desc" }],
        take: limit,
      });

      return users;
    } catch (error) {
      console.error("[UserService] 리더보드 조회 오류:", error);
      throw error;
    }
  }

  /**
   * Vooster 이메일 업데이트
   */
  static async updateVoosterEmail(
    discordId: string,
    email: string
  ): Promise<DiscordUser> {
    try {
      const user = await prisma.discordUser.update({
        where: { discordId },
        data: { voosterEmail: email },
      });

      console.log(
        `[UserService] Vooster 이메일 업데이트: ${user.username} → ${email}`
      );
      return user;
    } catch (error) {
      console.error("[UserService] Vooster 이메일 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 포인트 업데이트
   */
  static async updateUserPoints(
    userId: number,
    totalPoints: number
  ): Promise<DiscordUser> {
    try {
      const user = await prisma.discordUser.update({
        where: { id: userId },
        data: {
          currentReward: totalPoints,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      console.error("[UserService] 사용자 포인트 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자 레벨 업데이트
   */
  static async updateUserLevel(
    userId: number,
    level: number
  ): Promise<DiscordUser> {
    try {
      const user = await prisma.discordUser.update({
        where: { id: userId },
        data: {
          currentLevel: level,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      console.error("[UserService] 사용자 레벨 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 일일 보너스 시간 업데이트
   */
  static async updateDailyBonusTime(
    userId: number,
    time: Date
  ): Promise<DiscordUser> {
    try {
      const user = await prisma.discordUser.update({
        where: { id: userId },
        data: {
          lastDailyBonus: time,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      console.error("[UserService] 일일 보너스 시간 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 보상 히스토리 생성
   */
  static async createRewardHistory(data: {
    discordUserId: number;
    amount: number;
    type: string;
    reason?: string;
    discordEventId?: number;
  }): Promise<void> {
    try {
      await prisma.rewardHistory.create({
        data: {
          discordUserId: data.discordUserId,
          amount: data.amount,
          type: data.type,
          reason: data.reason || null,
          discordEventId: data.discordEventId || null,
        },
      });
    } catch (error) {
      console.error("[UserService] 보상 히스토리 생성 오류:", error);
      throw error;
    }
  }
}
