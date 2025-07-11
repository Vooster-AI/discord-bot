import { PrismaClient } from "@prisma/client";
import {
  ILevelRepository,
  Level,
  DiscordRole,
  LevelProgress,
} from "../../domain";

/**
 * Prisma를 사용한 레벨 저장소 구현체
 */
export class PrismaLevelRepository implements ILevelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 포인트로 레벨 계산
   */
  async calculateLevelFromReward(totalReward: number): Promise<number> {
    const level = await this.prisma.level.findFirst({
      where: {
        requiredRewardAmount: { lte: totalReward },
      },
      orderBy: {
        levelNumber: "desc",
      },
    });

    return level?.levelNumber || 1;
  }

  /**
   * 현재 레벨 정보 조회
   */
  async getCurrentLevel(totalReward: number): Promise<Level | null> {
    const level = await this.prisma.level.findFirst({
      where: {
        requiredRewardAmount: { lte: totalReward },
      },
      orderBy: {
        levelNumber: "desc",
      },
    });

    return level ? this.mapToLevel(level) : null;
  }

  /**
   * 다음 레벨 정보 조회
   */
  async getNextLevel(currentLevel: number): Promise<Level | null> {
    const level = await this.prisma.level.findFirst({
      where: {
        levelNumber: currentLevel + 1,
      },
    });

    return level ? this.mapToLevel(level) : null;
  }

  /**
   * 레벨 번호로 레벨 조회
   */
  async findByLevelNumber(levelNumber: number): Promise<Level | null> {
    const level = await this.prisma.level.findUnique({
      where: { levelNumber },
    });

    return level ? this.mapToLevel(level) : null;
  }

  /**
   * 모든 레벨 조회
   */
  async getAllLevels(): Promise<Level[]> {
    const levels = await this.prisma.level.findMany({
      orderBy: { levelNumber: "asc" },
    });

    return levels.map((level) => this.mapToLevel(level));
  }

  /**
   * 레벨 진행률 계산
   */
  async calculateProgress(
    currentReward: number,
    currentLevel: number
  ): Promise<LevelProgress> {
    const currentLevelData = await this.prisma.level.findUnique({
      where: { levelNumber: currentLevel },
    });

    const nextLevelData = await this.prisma.level.findUnique({
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
      ? Math.min((progress / (nextLevelReward - currentLevelReward)) * 100, 100)
      : 100;

    return {
      currentLevelReward,
      nextLevelReward,
      progress,
      progressPercentage,
    };
  }

  /**
   * 레벨에 연결된 역할 조회
   */
  async getRoleForLevel(levelNumber: number): Promise<DiscordRole | null> {
    const level = await this.prisma.level.findUnique({
      where: { levelNumber },
      include: { role: true },
    });

    return level?.role ? this.mapToDiscordRole(level.role) : null;
  }

  /**
   * Prisma 모델을 도메인 엔티티로 변환
   */
  private mapToLevel(prismaLevel: any): Level {
    return {
      id: prismaLevel.id,
      levelNumber: prismaLevel.levelNumber,
      requiredRewardAmount: prismaLevel.requiredRewardAmount,
      levelName: prismaLevel.levelName,
      discordRoleTableId: prismaLevel.discordRoleTableId,
      createdAt: prismaLevel.createdAt,
    };
  }

  /**
   * Prisma 모델을 도메인 엔티티로 변환
   */
  private mapToDiscordRole(prismaRole: any): DiscordRole {
    return {
      id: prismaRole.id,
      discordRoleId: prismaRole.discordRoleId,
      roleName: prismaRole.roleName,
      description: prismaRole.description,
      createdAt: prismaRole.createdAt,
    };
  }
}
