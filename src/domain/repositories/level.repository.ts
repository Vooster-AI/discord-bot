import { Level, DiscordRole, LevelProgress } from "../entities/level.entity";

/**
 * 레벨 저장소 인터페이스
 */
export interface ILevelRepository {
  /**
   * 포인트로 레벨 계산
   */
  calculateLevelFromReward(totalReward: number): Promise<number>;

  /**
   * 현재 레벨 정보 조회
   */
  getCurrentLevel(totalReward: number): Promise<Level | null>;

  /**
   * 다음 레벨 정보 조회
   */
  getNextLevel(currentLevel: number): Promise<Level | null>;

  /**
   * 레벨 번호로 레벨 조회
   */
  findByLevelNumber(levelNumber: number): Promise<Level | null>;

  /**
   * 모든 레벨 조회
   */
  getAllLevels(): Promise<Level[]>;

  /**
   * 레벨 진행률 계산
   */
  calculateProgress(
    currentReward: number,
    currentLevel: number
  ): Promise<LevelProgress>;

  /**
   * 레벨에 연결된 역할 조회
   */
  getRoleForLevel(levelNumber: number): Promise<DiscordRole | null>;
}
