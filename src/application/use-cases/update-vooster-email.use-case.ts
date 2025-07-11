import { IUserRepository, User } from "../../domain";

/**
 * Vooster 이메일 업데이트 유스케이스
 */
export class UpdateVoosterEmailUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Vooster 이메일 업데이트 실행
   */
  async execute(discordId: string, email: string): Promise<User> {
    try {
      // 1. 이메일 유효성 검증
      if (!this.isValidEmail(email)) {
        throw new Error("유효하지 않은 이메일 형식입니다.");
      }

      // 2. 사용자 조회
      const user = await this.userRepository.findByDiscordId(discordId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      // 3. 이메일 업데이트
      const updatedUser = await this.userRepository.updateVoosterEmail(
        user.id,
        email
      );

      return updatedUser;
    } catch (error) {
      console.error("[UpdateVoosterEmailUseCase] 이메일 업데이트 오류:", error);
      throw error;
    }
  }

  /**
   * 이메일 유효성 검증
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
