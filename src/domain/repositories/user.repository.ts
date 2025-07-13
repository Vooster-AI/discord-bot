import { User, CreateUserData, UpdateUserData } from "../entities/user.entity";

/**
 * 사용자 저장소 인터페이스
 * 실제 데이터베이스 구현에 의존하지 않는 순수한 포트(Port)
 */
export interface IUserRepository {
  /**
   * Discord ID로 사용자 찾기
   */
  findByDiscordId(discordId: string): Promise<User | null>;

  /**
   * 사용자 ID로 사용자 찾기
   */
  findById(id: number): Promise<User | null>;

  /**
   * 사용자 생성
   */
  create(userData: CreateUserData): Promise<User>;

  /**
   * 사용자 업데이트
   */
  update(id: number, userData: UpdateUserData): Promise<User>;

  /**
   * 사용자 찾기 또는 생성
   */
  findOrCreate(userData: CreateUserData): Promise<User>;

  /**
   * 사용자 포인트 업데이트
   */
  updatePoints(id: number, totalPoints: number): Promise<User>;

  /**
   * 사용자 레벨 업데이트
   */
  updateLevel(id: number, level: number): Promise<User>;

  /**
   * 상위 사용자 목록 조회 (리더보드)
   */
  getTopUsers(limit: number): Promise<User[]>;

  /**
   * Vooster 이메일 업데이트
   */
  updateVoosterEmail(id: number, email: string): Promise<User>;

  /**
   * 일일 보너스 시간 업데이트
   */
  updateDailyBonusTime(id: number, time: Date): Promise<User>;
}
