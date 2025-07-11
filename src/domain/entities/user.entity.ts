/**
 * 사용자 도메인 엔티티
 * 외부 프레임워크에 의존하지 않는 순수한 비즈니스 로직
 */
export interface User {
  id: number;
  discordId: string;
  username: string;
  globalName: string | null;
  discriminator: string | null;
  avatarUrl: string | null;
  currentReward: number;
  currentLevel: number;
  voosterEmail: string | null;
  joinedAt: Date;
  updatedAt: Date;
}

/**
 * 사용자 생성 시 필요한 데이터
 */
export interface CreateUserData {
  discordId: string;
  username: string;
  globalName?: string | null;
  discriminator?: string | null;
  avatarUrl?: string | null;
}

/**
 * 사용자 업데이트 시 필요한 데이터
 */
export interface UpdateUserData {
  username?: string;
  globalName?: string | null;
  discriminator?: string | null;
  avatarUrl?: string | null;
  currentReward?: number;
  currentLevel?: number;
  voosterEmail?: string | null;
}
