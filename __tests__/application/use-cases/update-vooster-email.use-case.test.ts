import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateVoosterEmailUseCase } from "../../../src/application/use-cases/update-vooster-email.use-case";
import { IUserRepository, User } from "../../../src/domain";

let userRepository: IUserRepository;
let useCase: UpdateVoosterEmailUseCase;

const mockUser: User = {
  id: 1,
  discordId: "user123",
  username: "testuser",
  globalName: "Test User",
  discriminator: null,
  avatarUrl: "https://example.com/avatar.jpg",
  currentReward: 10,
  currentLevel: 1,
  voosterEmail: null,
  joinedAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

describe("UpdateVoosterEmailUseCase", () => {
  beforeEach(() => {
    userRepository = {
      findByDiscordId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findOrCreate: vi.fn(),
      updatePoints: vi.fn(),
      updateLevel: vi.fn(),
      getTopUsers: vi.fn(),
      updateVoosterEmail: vi.fn(),
    };

    useCase = new UpdateVoosterEmailUseCase(userRepository);
  });

  describe("execute", () => {
    it("should update the vooster email for an existing user with a valid email", async () => {
      // Arrange: 유효한 이메일과 존재하는 사용자 상황 설정
      const validEmail = "test@vooster.ai";
      const updatedUser = { ...mockUser, voosterEmail: validEmail };

      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (userRepository.updateVoosterEmail as any).mockResolvedValue(updatedUser);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123", validEmail);

      // Assert: 메서드 호출 검증
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith("user123");
      expect(userRepository.updateVoosterEmail).toHaveBeenCalledWith(
        1,
        validEmail
      );

      // Assert: 반환된 user 객체의 voosterEmail이 업데이트 되었는지 확인
      expect(result).toEqual(updatedUser);
      expect(result.voosterEmail).toBe(validEmail);
    });

    it("should throw an error if the user does not exist", async () => {
      // Arrange: 존재하지 않는 사용자 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(null);

      // Act & Assert: 에러 발생 검증
      await expect(
        useCase.execute("nonexistent", "test@vooster.ai")
      ).rejects.toThrow("사용자를 찾을 수 없습니다.");

      // Assert: updateVoosterEmail이 호출되지 않았는지 확인
      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });

    it.each([
      "plainaddress",
      "#@%^%#$@#$@#.com",
      "@example.com",
      "Joe Smith <email@example.com>",
      "email.example.com",
      "email@example@example.com",
      "email@example.com (Joe Smith)",
      "email@example",
      "email@example.",
      "",
      " ",
      "email@",
      "@.com",
    ])(
      "should throw an error for invalid email format: %s",
      async (invalidEmail) => {
        // Arrange: 유효하지 않은 이메일 설정
        (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);

        // Act & Assert: 이메일 형식 검증 에러 발생 확인
        await expect(useCase.execute("user123", invalidEmail)).rejects.toThrow(
          "유효하지 않은 이메일 형식입니다."
        );

        // Assert: updateVoosterEmail이 호출되지 않았는지 확인
        expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
      }
    );

    it.each([
      "user@example.com",
      "test.email@example.com",
      "user+tag@example.com",
      "user.name@example.co.uk",
      "user123@example-site.com",
      "firstname.lastname@example.com",
      "test@vooster.ai",
      "admin@company.org",
      "info@website.net",
      "contact@domain.io",
    ])("should accept valid email format: %s", async (validEmail) => {
      // Arrange: 유효한 이메일과 존재하는 사용자 상황 설정
      const updatedUser = { ...mockUser, voosterEmail: validEmail };

      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (userRepository.updateVoosterEmail as any).mockResolvedValue(updatedUser);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123", validEmail);

      // Assert: 성공적으로 업데이트되었는지 확인
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith("user123");
      expect(userRepository.updateVoosterEmail).toHaveBeenCalledWith(
        1,
        validEmail
      );
      expect(result.voosterEmail).toBe(validEmail);
    });

    it("should update email even if user already has an existing email", async () => {
      // Arrange: 이미 이메일이 있는 사용자 상황 설정
      const existingEmailUser = {
        ...mockUser,
        voosterEmail: "old@example.com",
      };
      const newEmail = "new@example.com";
      const updatedUser = { ...existingEmailUser, voosterEmail: newEmail };

      (userRepository.findByDiscordId as any).mockResolvedValue(
        existingEmailUser
      );
      (userRepository.updateVoosterEmail as any).mockResolvedValue(updatedUser);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123", newEmail);

      // Assert: 기존 이메일이 새 이메일로 업데이트되었는지 확인
      expect(userRepository.updateVoosterEmail).toHaveBeenCalledWith(
        1,
        newEmail
      );
      expect(result.voosterEmail).toBe(newEmail);
    });

    it("should handle edge case of empty string email", async () => {
      // Arrange: 빈 문자열 이메일 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);

      // Act & Assert: 빈 문자열은 유효하지 않은 이메일로 처리
      await expect(useCase.execute("user123", "")).rejects.toThrow(
        "유효하지 않은 이메일 형식입니다."
      );

      expect(userRepository.updateVoosterEmail).not.toHaveBeenCalled();
    });
  });
});
