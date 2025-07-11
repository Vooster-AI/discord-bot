import { GetUserProfileUseCase } from "../../../src/application/use-cases/get-user-profile.use-case";
import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  User,
  Level,
  LevelProgress,
  RewardHistory,
} from "../../../src/domain";

describe("GetUserProfileUseCase", () => {
  let useCase: GetUserProfileUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let levelRepository: jest.Mocked<ILevelRepository>;
  let rewardRepository: jest.Mocked<IRewardRepository>;

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
    voosterEmail: "test@vooster.ai",
    joinedAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  };

  const mockLevelProgress: LevelProgress = {
    currentLevelReward: 5,
    nextLevelReward: 50,
    progress: 10,
    progressPercentage: 22.22,
  };

  const mockNextLevel: Level = {
    id: 3,
    levelNumber: 3,
    requiredRewardAmount: 50,
    levelName: "Active",
    discordRoleTableId: 2,
    createdAt: new Date(),
  };

  const mockRewardHistory: RewardHistory[] = [
    {
      id: 1,
      discordUserId: 1,
      amount: 3,
      type: "forum_post",
      reason: "forum_post 활동 보상",
      discordEventId: null,
      createdAt: new Date("2023-01-02"),
    },
    {
      id: 2,
      discordUserId: 1,
      amount: 1,
      type: "message",
      reason: "message 활동 보상",
      discordEventId: null,
      createdAt: new Date("2023-01-01"),
    },
  ];

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

    levelRepository = {
      calculateLevelFromReward: jest.fn(),
      getCurrentLevel: jest.fn(),
      getNextLevel: jest.fn(),
      findByLevelNumber: jest.fn(),
      getAllLevels: jest.fn(),
      calculateProgress: jest.fn(),
      getRoleForLevel: jest.fn(),
    };

    rewardRepository = {
      createRewardHistory: jest.fn(),
      getRewardHistory: jest.fn(),
      getRewardableChannel: jest.fn(),
      getRewardableChannels: jest.fn(),
      upsertRewardableChannel: jest.fn(),
      getChannelRewardStats: jest.fn(),
    };

    useCase = new GetUserProfileUseCase(
      userRepository,
      levelRepository,
      rewardRepository
    );
  });

  describe("execute", () => {
    it("사용자 프로필을 정상적으로 조회해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      levelRepository.calculateProgress.mockResolvedValue(mockLevelProgress);
      levelRepository.getNextLevel.mockResolvedValue(mockNextLevel);
      rewardRepository.getRewardHistory.mockResolvedValue(mockRewardHistory);

      // When (실행)
      const result = await useCase.execute(discordId);

      // Then (검증)
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(levelRepository.calculateProgress).toHaveBeenCalledWith(
        mockUser.currentReward,
        mockUser.currentLevel
      );
      expect(levelRepository.getNextLevel).toHaveBeenCalledWith(
        mockUser.currentLevel
      );
      expect(rewardRepository.getRewardHistory).toHaveBeenCalledWith(
        mockUser.id,
        5
      );

      expect(result).toEqual({
        user: mockUser,
        levelProgress: mockLevelProgress,
        nextLevelName: mockNextLevel.levelName,
        recentRewards: mockRewardHistory,
      });
    });

    it("존재하지 않는 사용자의 경우 null을 반환해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";

      userRepository.findByDiscordId.mockResolvedValue(null);

      // When (실행)
      const result = await useCase.execute(discordId);

      // Then (검증)
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(levelRepository.calculateProgress).not.toHaveBeenCalled();
      expect(levelRepository.getNextLevel).not.toHaveBeenCalled();
      expect(rewardRepository.getRewardHistory).not.toHaveBeenCalled();

      expect(result).toBeNull();
    });

    it("다음 레벨이 없는 경우 nextLevelName이 undefined여야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      levelRepository.calculateProgress.mockResolvedValue(mockLevelProgress);
      levelRepository.getNextLevel.mockResolvedValue(null); // 다음 레벨 없음
      rewardRepository.getRewardHistory.mockResolvedValue(mockRewardHistory);

      // When (실행)
      const result = await useCase.execute(discordId);

      // Then (검증)
      expect(result).toEqual({
        user: mockUser,
        levelProgress: mockLevelProgress,
        nextLevelName: undefined,
        recentRewards: mockRewardHistory,
      });
    });

    it("보상 기록이 없는 경우 빈 배열을 반환해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      levelRepository.calculateProgress.mockResolvedValue(mockLevelProgress);
      levelRepository.getNextLevel.mockResolvedValue(mockNextLevel);
      rewardRepository.getRewardHistory.mockResolvedValue([]); // 보상 기록 없음

      // When (실행)
      const result = await useCase.execute(discordId);

      // Then (검증)
      expect(result).toEqual({
        user: mockUser,
        levelProgress: mockLevelProgress,
        nextLevelName: mockNextLevel.levelName,
        recentRewards: [],
      });
    });
  });

  describe("getLeaderboard", () => {
    it("리더보드를 정상적으로 조회해야 한다", async () => {
      // Given (준비)
      const limit = 10;
      const mockUsers: User[] = [
        { ...mockUser, currentReward: 100 },
        { ...mockUser, id: 2, discordId: "987654321", currentReward: 50 },
        { ...mockUser, id: 3, discordId: "555555555", currentReward: 25 },
      ];

      userRepository.getTopUsers.mockResolvedValue(mockUsers);

      // When (실행)
      const result = await useCase.getLeaderboard(limit);

      // Then (검증)
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(limit);
      expect(result).toEqual(mockUsers);
    });

    it("기본 limit 값(10)으로 리더보드를 조회해야 한다", async () => {
      // Given (준비)
      const mockUsers: User[] = [mockUser];

      userRepository.getTopUsers.mockResolvedValue(mockUsers);

      // When (실행)
      const result = await useCase.getLeaderboard();

      // Then (검증)
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(10); // 기본값
      expect(result).toEqual(mockUsers);
    });

    it("사용자가 없는 경우 빈 배열을 반환해야 한다", async () => {
      // Given (준비)
      const limit = 10;

      userRepository.getTopUsers.mockResolvedValue([]);

      // When (실행)
      const result = await useCase.getLeaderboard(limit);

      // Then (검증)
      expect(userRepository.getTopUsers).toHaveBeenCalledWith(limit);
      expect(result).toEqual([]);
    });
  });
});
