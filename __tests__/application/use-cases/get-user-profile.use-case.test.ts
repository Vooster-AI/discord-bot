import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetUserProfileUseCase } from "../../../src/application/use-cases/get-user-profile.use-case";
import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  User,
  LevelProgress,
  RewardHistory,
  Level,
} from "../../../src/domain";

let userRepository: IUserRepository;
let levelRepository: ILevelRepository;
let rewardRepository: IRewardRepository;
let useCase: GetUserProfileUseCase;

// Mock 데이터 정의
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

const mockLevelProgress: LevelProgress = {
  currentLevelReward: 0,
  nextLevelReward: 15,
  progress: 10,
  progressPercentage: 66.67,
};

const mockNextLevel: Level = {
  id: 2,
  levelNumber: 2,
  requiredRewardAmount: 15,
  levelName: "Regular",
  discordRoleTableId: null,
  createdAt: new Date("2023-01-01"),
};

const mockRewards: RewardHistory[] = [
  {
    id: 1,
    discordUserId: 1,
    amount: 5,
    type: "message",
    reason: "message 활동 보상",
    discordEventId: null,
    createdAt: new Date("2023-01-01"),
  },
  {
    id: 2,
    discordUserId: 1,
    amount: 3,
    type: "comment",
    reason: "comment 활동 보상",
    discordEventId: null,
    createdAt: new Date("2023-01-02"),
  },
];

describe("GetUserProfileUseCase", () => {
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

    levelRepository = {
      calculateLevelFromReward: vi.fn(),
      getCurrentLevel: vi.fn(),
      getNextLevel: vi.fn(),
      findByLevelNumber: vi.fn(),
      getAllLevels: vi.fn(),
      calculateProgress: vi.fn(),
      getRoleForLevel: vi.fn(),
    };

    rewardRepository = {
      createRewardHistory: vi.fn(),
      getRewardHistory: vi.fn(),
      getRewardableChannel: vi.fn(),
      getRewardableChannels: vi.fn(),
      upsertRewardableChannel: vi.fn(),
      getChannelRewardStats: vi.fn(),
    };

    useCase = new GetUserProfileUseCase(
      userRepository,
      levelRepository,
      rewardRepository
    );
  });

  // --- 시나리오 그룹 1: 프로필 조회 (execute) ---
  describe("execute (Get Profile)", () => {
    it("should return a complete user profile for an existing user", async () => {
      // Arrange: 모든 데이터가 정상적으로 존재하는 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (levelRepository.calculateProgress as any).mockResolvedValue(
        mockLevelProgress
      );
      (levelRepository.getNextLevel as any).mockResolvedValue(mockNextLevel);
      (rewardRepository.getRewardHistory as any).mockResolvedValue(mockRewards);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123");

      // Assert: 각 repository의 메서드가 정확한 인자로 호출되었는지 확인
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith("user123");
      expect(levelRepository.calculateProgress).toHaveBeenCalledWith(10, 1);
      expect(levelRepository.getNextLevel).toHaveBeenCalledWith(1);
      expect(rewardRepository.getRewardHistory).toHaveBeenCalledWith(1, 5);

      // Assert: 반환된 객체의 모든 필드가 정확한지 확인
      expect(result).toEqual({
        user: mockUser,
        levelProgress: mockLevelProgress,
        nextLevelName: "Regular",
        recentRewards: mockRewards,
      });
    });

    it("should return null when the user does not exist", async () => {
      // Arrange: 존재하지 않는 사용자 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(null);

      // Act: useCase.execute 실행
      const result = await useCase.execute("nonexistent");

      // Assert: 반환된 값이 null인지 확인
      expect(result).toBeNull();

      // Assert: levelRepository와 rewardRepository의 메서드가 호출되지 않았는지 확인
      expect(levelRepository.calculateProgress).not.toHaveBeenCalled();
      expect(levelRepository.getNextLevel).not.toHaveBeenCalled();
      expect(rewardRepository.getRewardHistory).not.toHaveBeenCalled();
    });

    it("should return a profile with an undefined nextLevelName if the user is at max level", async () => {
      // Arrange: 최고 레벨 사용자 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (levelRepository.calculateProgress as any).mockResolvedValue(
        mockLevelProgress
      );
      (levelRepository.getNextLevel as any).mockResolvedValue(null);
      (rewardRepository.getRewardHistory as any).mockResolvedValue(mockRewards);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123");

      // Assert: 반환된 객체의 nextLevelName이 undefined인지 확인
      expect(result?.nextLevelName).toBeUndefined();
      expect(result?.user).toEqual(mockUser);
    });

    it("should return empty rewards array when user has no reward history", async () => {
      // Arrange: 보상 기록이 없는 사용자 상황 설정
      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (levelRepository.calculateProgress as any).mockResolvedValue(
        mockLevelProgress
      );
      (levelRepository.getNextLevel as any).mockResolvedValue(mockNextLevel);
      (rewardRepository.getRewardHistory as any).mockResolvedValue([]);

      // Act: useCase.execute 실행
      const result = await useCase.execute("user123");

      // Assert: 반환된 객체의 recentRewards가 빈 배열인지 확인
      expect(result?.recentRewards).toEqual([]);
      expect(result?.user).toEqual(mockUser);
    });
  });

  // --- 시나리오 그룹 2: 리더보드 조회 (getLeaderboard) ---
  describe("getLeaderboard", () => {
    it("should return a list of top users based on the limit", async () => {
      // Arrange: 사용자 배열 설정
      const topUsers = [mockUser, { ...mockUser, id: 2, discordId: "user456" }];
      (userRepository.getTopUsers as any).mockResolvedValue(topUsers);

      // Act: useCase.getLeaderboard 실행 (limit: 5)
      const result = await useCase.getLeaderboard(5);

      // Assert: userRepository.getTopUsers가 인자 5와 함께 호출되었는지 확인
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(5);

      // Assert: 반환된 값이 설정된 사용자 배열과 동일한지 확인
      expect(result).toEqual(topUsers);
    });

    it("should use a default limit of 10 if no limit is provided", async () => {
      // Arrange: 사용자 배열 설정
      const topUsers = [mockUser];
      (userRepository.getTopUsers as any).mockResolvedValue(topUsers);

      // Act: useCase.getLeaderboard 실행 (인자 없음)
      const result = await useCase.getLeaderboard();

      // Assert: userRepository.getTopUsers가 인자 10과 함께 호출되었는지 확인
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(10);

      // Assert: 반환된 값이 설정된 사용자 배열과 동일한지 확인
      expect(result).toEqual(topUsers);
    });

    it("should return empty array when no users exist", async () => {
      // Arrange: 사용자가 없는 상황 설정
      (userRepository.getTopUsers as any).mockResolvedValue([]);

      // Act: useCase.getLeaderboard 실행
      const result = await useCase.getLeaderboard(5);

      // Assert: 빈 배열이 반환되는지 확인
      expect(result).toEqual([]);
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(5);
    });
  });
});
