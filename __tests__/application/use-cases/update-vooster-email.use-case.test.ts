import { UpdateVoosterEmailUseCase } from "../../../src/application/use-cases/update-vooster-email.use-case";
import { IUserRepository, User } from "../../../src/domain";

describe("UpdateVoosterEmailUseCase", () => {
  let useCase: UpdateVoosterEmailUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  // 테스트 데이터
  const mockUser: User = {
    id: 1,
    discordId: "123456789",
    username: "testuser",
    globalName: "Test User",
    discriminator: null,
    avatarUrl: "https://example.com/avatar.jpg",
    currentReward: 15,
    currentLevel: 2,
    voosterEmail: null,
    joinedAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  };

  const updatedUser: User = {
    ...mockUser,
    voosterEmail: "test@vooster.ai",
    updatedAt: new Date("2023-01-03"),
  };

  beforeEach(() => {
    // Mock 객체 생성
    userRepository = {
      findByDiscordId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findOrCreate: jest.fn(),
      updatePoints: jest.fn(),
      updateLevel: jest.fn(),
      getTopUsers: jest.fn(),
      updateVoosterEmail: jest.fn(),
    };

    useCase = new UpdateVoosterEmailUseCase(userRepository);
  });

  describe("execute", () => {
    it("유효한 이메일로 사용자의 Vooster 이메일을 업데이트해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const email = "test@vooster.ai";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      userRepository.updateVoosterEmail.mockResolvedValue(updatedUser);

      // When (실행)
      const result = await useCase.execute(discordId, email);

      // Then (검증)
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(userRepository.updateVoosterEmail).toHaveBeenCalledWith(
        mockUser.id,
        email
      );
      expect(result).toEqual(updatedUser);
    });

    it("다양한 유효한 이메일 형식을 허용해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const validEmails = [
        "test@vooster.ai",
        "user.name@domain.com",
        "user+tag@example.org",
        "user123@test-domain.co.uk",
        "admin@sub.domain.com",
      ];

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      userRepository.updateVoosterEmail.mockResolvedValue(updatedUser);

      // When & Then (실행 및 검증)
      for (const email of validEmails) {
        const result = await useCase.execute(discordId, email);
        expect(result).toEqual(updatedUser);
      }

      expect(userRepository.updateVoosterEmail).toHaveBeenCalledTimes(
        validEmails.length
      );
    });

    it("존재하지 않는 사용자의 경우 오류를 발생시켜야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const email = "test@vooster.ai";

      userRepository.findByDiscordId.mockResolvedValue(null);

      // When & Then (실행 및 검증)
      await expect(useCase.execute(discordId, email)).rejects.toThrow(
        "사용자를 찾을 수 없습니다."
      );

      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });

    it("유효하지 않은 이메일 형식의 경우 오류를 발생시켜야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const invalidEmail = "invalid-email";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);

      // When & Then (실행 및 검증)
      await expect(useCase.execute(discordId, invalidEmail)).rejects.toThrow(
        "유효하지 않은 이메일 형식입니다."
      );

      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });

    it("빈 이메일 문자열의 경우 오류를 발생시켜야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const emptyEmail = "";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);

      // When & Then (실행 및 검증)
      await expect(useCase.execute(discordId, emptyEmail)).rejects.toThrow(
        "유효하지 않은 이메일 형식입니다."
      );

      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });

    it("@가 없는 이메일의 경우 오류를 발생시켜야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const noAtEmail = "test.domain.com";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);

      // When & Then (실행 및 검증)
      await expect(useCase.execute(discordId, noAtEmail)).rejects.toThrow(
        "유효하지 않은 이메일 형식입니다."
      );

      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });

    it("이메일 업데이트 중 데이터베이스 오류가 발생하면 오류를 전파해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const email = "test@vooster.ai";
      const dbError = new Error("Database connection failed");

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      userRepository.updateVoosterEmail.mockRejectedValue(dbError);

      // When & Then (실행 및 검증)
      await expect(useCase.execute(discordId, email)).rejects.toThrow(
        "Database connection failed"
      );

      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(userRepository.updateVoosterEmail).toHaveBeenCalledWith(
        mockUser.id,
        email
      );
    });
  });
});
