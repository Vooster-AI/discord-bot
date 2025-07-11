import { describe, it, expect, beforeEach, vi } from "vitest";
import { GrantRewardUseCase } from "../../../src/application/use-cases/grant-reward.use-case";
import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  IDiscordService,
  User,
  RewardableChannel,
  DiscordRole,
  RewardType,
  Level,
} from "../../../src/domain";

// Mock 객체 선언
let userRepository: IUserRepository;
let levelRepository: ILevelRepository;
let rewardRepository: IRewardRepository;
let discordService: IDiscordService;
let useCase: GrantRewardUseCase;

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

const mockChannel: RewardableChannel = {
  id: 1,
  channelId: "channel123",
  channelName: "test-channel",
  messageRewardAmount: 5,
  commentRewardAmount: 3,
  forumPostRewardAmount: 10,
  isActive: true,
  createdAt: new Date("2023-01-01"),
};

const mockRole: DiscordRole = {
  id: 1,
  discordRoleId: "role123",
  roleName: "Beta MVP",
  description: "Beta test role",
  createdAt: new Date("2023-01-01"),
};

const mockLevel: Level = {
  id: 1,
  levelNumber: 1,
  requiredRewardAmount: 0,
  levelName: "Newbie",
  discordRoleTableId: null,
  createdAt: new Date("2023-01-01"),
};

describe("GrantRewardUseCase", () => {
  beforeEach(() => {
    // 각 테스트 전에 Mock 객체 초기화
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

    discordService = {
      assignRoleToUser: vi.fn(),
      sendDirectMessage: vi.fn(),
      fetchUser: vi.fn(),
      fetchGuildMember: vi.fn(),
      hasRole: vi.fn(),
      fetchChannel: vi.fn(),
    };

    useCase = new GrantRewardUseCase(
      userRepository,
      levelRepository,
      rewardRepository,
      discordService
    );
  });

  // --- 시나리오 그룹 1: 활동 보상 (execute) ---
  describe("execute (Activity Rewards)", () => {
    it("should grant points and record history when a user acts in a rewardable channel", async () => {
      // Arrange: 사용자가 보상 가능 채널에서 활동하는 상황 설정
      const updatedUser = { ...mockUser, currentReward: 15 };

      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(
        mockChannel
      );
      (userRepository.updatePoints as any).mockResolvedValue(updatedUser);
      (levelRepository.calculateLevelFromReward as any).mockResolvedValue(1); // 레벨업 없음
      (levelRepository.findByLevelNumber as any).mockResolvedValue(mockLevel);
      (rewardRepository.createRewardHistory as any).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 5,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 모든 메서드 호출과 결과 검증
      expect(userRepository.findOrCreate).toHaveBeenCalledWith({
        discordId: "user123",
        username: "testuser",
        globalName: "Test User",
      });
      expect(rewardRepository.getRewardableChannel).toHaveBeenCalledWith(
        "channel123"
      );
      expect(userRepository.updatePoints).toHaveBeenCalledWith(1, 15);
      expect(rewardRepository.createRewardHistory).toHaveBeenCalledWith({
        discordUserId: 1,
        amount: 5,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: undefined,
      });
      expect(discordService.assignRoleToUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        rewardAmount: 5,
        newTotalReward: 15,
        leveledUp: false,
        newLevel: undefined,
        assignedRoleId: undefined,
      });
    });

    it("should level up the user, assign a role, and send a DM when enough points are accumulated", async () => {
      // Arrange: 레벨업이 가능한 상황 설정
      const updatedUser = { ...mockUser, currentReward: 15 };
      const levelTwoMock = {
        ...mockLevel,
        levelNumber: 2,
        levelName: "Regular",
      };

      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(
        mockChannel
      );
      (userRepository.updatePoints as any).mockResolvedValue(updatedUser);
      (levelRepository.calculateLevelFromReward as any).mockResolvedValue(2); // 레벨업
      (levelRepository.getRoleForLevel as any).mockResolvedValue(mockRole);
      (levelRepository.findByLevelNumber as any).mockResolvedValue(
        levelTwoMock
      );
      (rewardRepository.createRewardHistory as any).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 5,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });
      (userRepository.updateLevel as any).mockResolvedValue(updatedUser);
      (discordService.assignRoleToUser as any).mockResolvedValue(undefined);
      (discordService.sendDirectMessage as any).mockResolvedValue(true);

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 레벨업 관련 메서드 호출 검증
      expect(userRepository.updateLevel).toHaveBeenCalledWith(1, 2);
      expect(levelRepository.getRoleForLevel).toHaveBeenCalledWith(2);
      expect(discordService.assignRoleToUser).toHaveBeenCalledWith(
        "user123",
        "role123"
      );
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        "user123",
        "🎉 축하합니다! 레벨 2(Regular)에 도달했습니다!\n새로운 역할 **Beta MVP**을 획득하셨습니다!"
      );
      expect(result).toEqual({
        success: true,
        rewardAmount: 5,
        newTotalReward: 15,
        leveledUp: true,
        newLevel: 2,
        assignedRoleId: "role123",
      });
    });

    it("should level up without assigning a role if the new level has no associated role", async () => {
      // Arrange: 레벨업은 하지만 역할이 없는 상황
      const updatedUser = { ...mockUser, currentReward: 15 };
      const levelTwoMock = {
        ...mockLevel,
        levelNumber: 2,
        levelName: "Regular",
      };

      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(
        mockChannel
      );
      (userRepository.updatePoints as any).mockResolvedValue(updatedUser);
      (levelRepository.calculateLevelFromReward as any).mockResolvedValue(2);
      (levelRepository.getRoleForLevel as any).mockResolvedValue(null);
      (levelRepository.findByLevelNumber as any).mockResolvedValue(
        levelTwoMock
      );
      (rewardRepository.createRewardHistory as any).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 5,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });
      (userRepository.updateLevel as any).mockResolvedValue(updatedUser);
      (discordService.sendDirectMessage as any).mockResolvedValue(true);

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 역할 부여가 없는 레벨업 검증
      expect(discordService.assignRoleToUser).not.toHaveBeenCalled();
      expect(discordService.sendDirectMessage).not.toHaveBeenCalled(); // 역할이 없으면 DM도 전송되지 않음
      expect(result).toEqual({
        success: true,
        rewardAmount: 5,
        newTotalReward: 15,
        leveledUp: true,
        newLevel: 2,
        assignedRoleId: undefined,
      });
    });

    it("should do nothing if the channel is not rewardable (returns null)", async () => {
      // Arrange: 보상 불가능한 채널 상황
      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(null);

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 보상 처리가 일어나지 않았는지 검증
      expect(userRepository.updatePoints).not.toHaveBeenCalled();
      expect(rewardRepository.createRewardHistory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        rewardAmount: 0,
        newTotalReward: 10,
        leveledUp: false,
      });
    });

    it("should do nothing if the channel is inactive", async () => {
      // Arrange: 비활성 채널 상황
      const inactiveChannel = { ...mockChannel, isActive: false };

      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(
        inactiveChannel
      );

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 보상 처리가 일어나지 않았는지 검증
      expect(userRepository.updatePoints).not.toHaveBeenCalled();
      expect(rewardRepository.createRewardHistory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        rewardAmount: 0,
        newTotalReward: 10,
        leveledUp: false,
      });
    });

    it("should do nothing if the reward amount for the event type is zero", async () => {
      // Arrange: 보상 금액이 0인 상황
      const zeroRewardChannel = { ...mockChannel, messageRewardAmount: 0 };

      (userRepository.findOrCreate as any).mockResolvedValue(mockUser);
      (rewardRepository.getRewardableChannel as any).mockResolvedValue(
        zeroRewardChannel
      );

      // Act: useCase.execute 실행
      const result = await useCase.execute(
        "user123",
        "testuser",
        "Test User",
        "channel123",
        "message" as RewardType
      );

      // Assert: 보상 처리가 일어나지 않았는지 검증
      expect(userRepository.updatePoints).not.toHaveBeenCalled();
      expect(rewardRepository.createRewardHistory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        rewardAmount: 0,
        newTotalReward: 10,
        leveledUp: false,
      });
    });
  });

  // --- 시나리오 그룹 2: 수동 보상 (executeManualReward) ---
  describe("executeManualReward", () => {
    it("should grant manual points to an existing user", async () => {
      // Arrange: 관리자가 사용자에게 수동으로 포인트를 지급하는 상황
      const updatedUser = { ...mockUser, currentReward: 20 };

      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (userRepository.updatePoints as any).mockResolvedValue(updatedUser);
      (levelRepository.calculateLevelFromReward as any).mockResolvedValue(1);
      (levelRepository.findByLevelNumber as any).mockResolvedValue(mockLevel);
      (rewardRepository.createRewardHistory as any).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 10,
        type: "manual",
        reason: "관리자 수동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });

      // Act: useCase.executeManualReward 실행
      const result = await useCase.executeManualReward(
        "user123",
        10,
        "관리자 수동 보상"
      );

      // Assert: 수동 보상 처리 검증
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith("user123");
      expect(userRepository.updatePoints).toHaveBeenCalledWith(1, 20);
      expect(rewardRepository.createRewardHistory).toHaveBeenCalledWith({
        discordUserId: 1,
        amount: 10,
        type: "manual",
        reason: "관리자 수동 보상",
      });
      expect(result).toEqual({
        success: true,
        rewardAmount: 10,
        newTotalReward: 20,
        leveledUp: false,
        newLevel: undefined,
        assignedRoleId: undefined,
      });
    });

    it("should level up the user, assign a role, and send a DM when manual reward triggers level up", async () => {
      // Arrange: 수동 보상으로 레벨업이 가능한 상황 설정
      const updatedUser = { ...mockUser, currentReward: 25 };
      const levelTwoMock = {
        ...mockLevel,
        levelNumber: 2,
        levelName: "Regular",
      };

      (userRepository.findByDiscordId as any).mockResolvedValue(mockUser);
      (userRepository.updatePoints as any).mockResolvedValue(updatedUser);
      (levelRepository.calculateLevelFromReward as any).mockResolvedValue(2); // 레벨업
      (levelRepository.getRoleForLevel as any).mockResolvedValue(mockRole);
      (levelRepository.findByLevelNumber as any).mockResolvedValue(
        levelTwoMock
      );
      (rewardRepository.createRewardHistory as any).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 15,
        type: "manual",
        reason: "관리자 수동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });
      (userRepository.updateLevel as any).mockResolvedValue(updatedUser);
      (discordService.assignRoleToUser as any).mockResolvedValue(undefined);
      (discordService.sendDirectMessage as any).mockResolvedValue(true);

      // Act: useCase.executeManualReward 실행
      const result = await useCase.executeManualReward(
        "user123",
        15,
        "관리자 수동 보상"
      );

      // Assert: 수동 보상으로 레벨업 관련 메서드 호출 검증
      expect(userRepository.updateLevel).toHaveBeenCalledWith(1, 2);
      expect(levelRepository.getRoleForLevel).toHaveBeenCalledWith(2);
      expect(discordService.assignRoleToUser).toHaveBeenCalledWith(
        "user123",
        "role123"
      );
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        "user123",
        "🎉 축하합니다! 레벨 2(Regular)에 도달했습니다!\n새로운 역할 **Beta MVP**을 획득하셨습니다!"
      );
      expect(result).toEqual({
        success: true,
        rewardAmount: 15,
        newTotalReward: 25,
        leveledUp: true,
        newLevel: 2,
        assignedRoleId: "role123",
      });
    });

    it("should throw an error if trying to grant manual reward to a non-existent user", async () => {
      // Arrange: 존재하지 않는 사용자에게 보상을 시도하는 상황
      (userRepository.findByDiscordId as any).mockResolvedValue(null);

      // Act & Assert: 에러 발생 검증
      await expect(
        useCase.executeManualReward("nonexistent", 10, "관리자 수동 보상")
      ).rejects.toThrow("사용자를 찾을 수 없습니다.");
    });
  });
});
