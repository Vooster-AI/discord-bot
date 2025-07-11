import { PrismaClient } from "@prisma/client";
import {
  IUserRepository,
  User,
  CreateUserData,
  UpdateUserData,
} from "../../domain";

/**
 * Prisma를 사용한 사용자 저장소 구현체
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Discord ID로 사용자 찾기
   */
  async findByDiscordId(discordId: string): Promise<User | null> {
    const user = await this.prisma.discordUser.findUnique({
      where: { discordId },
    });

    return user ? this.mapToUser(user) : null;
  }

  /**
   * 사용자 ID로 사용자 찾기
   */
  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.discordUser.findUnique({
      where: { id },
    });

    return user ? this.mapToUser(user) : null;
  }

  /**
   * 사용자 생성
   */
  async create(userData: CreateUserData): Promise<User> {
    const user = await this.prisma.discordUser.create({
      data: {
        discordId: userData.discordId,
        username: userData.username,
        globalName: userData.globalName,
        discriminator: userData.discriminator,
        avatarUrl: userData.avatarUrl,
      },
    });

    return this.mapToUser(user);
  }

  /**
   * 사용자 업데이트
   */
  async update(id: number, userData: UpdateUserData): Promise<User> {
    const user = await this.prisma.discordUser.update({
      where: { id },
      data: {
        username: userData.username,
        globalName: userData.globalName,
        discriminator: userData.discriminator,
        avatarUrl: userData.avatarUrl,
        currentReward: userData.currentReward,
        currentLevel: userData.currentLevel,
        voosterEmail: userData.voosterEmail,
      },
    });

    return this.mapToUser(user);
  }

  /**
   * 사용자 찾기 또는 생성
   */
  async findOrCreate(userData: CreateUserData): Promise<User> {
    // 기존 사용자 찾기
    let user = await this.prisma.discordUser.findUnique({
      where: { discordId: userData.discordId },
    });

    if (!user) {
      // 새 사용자 생성
      user = await this.prisma.discordUser.create({
        data: {
          discordId: userData.discordId,
          username: userData.username,
          globalName: userData.globalName,
          discriminator: userData.discriminator,
          avatarUrl: userData.avatarUrl,
        },
      });
    } else {
      // 기존 사용자 정보 업데이트
      user = await this.prisma.discordUser.update({
        where: { discordId: userData.discordId },
        data: {
          username: userData.username,
          globalName: userData.globalName,
          discriminator: userData.discriminator,
          avatarUrl: userData.avatarUrl,
        },
      });
    }

    return this.mapToUser(user);
  }

  /**
   * 사용자 포인트 업데이트
   */
  async updatePoints(id: number, totalPoints: number): Promise<User> {
    const user = await this.prisma.discordUser.update({
      where: { id },
      data: {
        currentReward: totalPoints,
        updatedAt: new Date(),
      },
    });

    return this.mapToUser(user);
  }

  /**
   * 사용자 레벨 업데이트
   */
  async updateLevel(id: number, level: number): Promise<User> {
    const user = await this.prisma.discordUser.update({
      where: { id },
      data: {
        currentLevel: level,
        updatedAt: new Date(),
      },
    });

    return this.mapToUser(user);
  }

  /**
   * 상위 사용자 목록 조회 (리더보드)
   */
  async getTopUsers(limit: number): Promise<User[]> {
    const users = await this.prisma.discordUser.findMany({
      orderBy: [{ currentReward: "desc" }, { currentLevel: "desc" }],
      take: limit,
    });

    return users.map((user) => this.mapToUser(user));
  }

  /**
   * Vooster 이메일 업데이트
   */
  async updateVoosterEmail(id: number, email: string): Promise<User> {
    const user = await this.prisma.discordUser.update({
      where: { id },
      data: {
        voosterEmail: email,
        updatedAt: new Date(),
      },
    });

    return this.mapToUser(user);
  }

  /**
   * Prisma 모델을 도메인 엔티티로 변환
   */
  private mapToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      discordId: prismaUser.discordId,
      username: prismaUser.username,
      globalName: prismaUser.globalName,
      discriminator: prismaUser.discriminator,
      avatarUrl: prismaUser.avatarUrl,
      currentReward: prismaUser.currentReward,
      currentLevel: prismaUser.currentLevel,
      voosterEmail: prismaUser.voosterEmail,
      joinedAt: prismaUser.joinedAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
