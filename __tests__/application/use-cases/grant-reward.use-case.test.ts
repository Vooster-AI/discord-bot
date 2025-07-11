import { GrantRewardUseCase } from "../../../src/application/use-cases/grant-reward.use-case";
import {
  IUserRepository,
  ILevelRepository,
  IRewardRepository,
  IDiscordService,
  User,
  RewardableChannel,
  DiscordRole,
} from "../../../src/domain";

describe("GrantRewardUseCase", () => {
  let useCase: GrantRewardUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let levelRepository: jest.Mocked<ILevelRepository>;
  let rewardRepository: jest.Mocked<IRewardRepository>;
  let discordService: jest.Mocked<IDiscordService>;

  // 테스트 데이터
  const mockUser: User = {
    id: 1,
    discordId: "123456789",
    username: "testuser",
    globalName: "Test User",
    discriminator: null,
    avatarUrl: "https://example.com/avatar.jpg",
    currentReward: 10,
    currentLevel: 1,
    voosterEmail: null,
    joinedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChannel: RewardableChannel = {
    id: 1,
    channelId: "987654321",
    channelName: "general",
    messageRewardAmount: 1,
    commentRewardAmount: 2,
    forumPostRewardAmount: 3,
    isActive: true,
    createdAt: new Date(),
  };

  const mockRole: DiscordRole = {
    id: 1,
    discordRoleId: "555555555",
    roleName: "Beta MVP",
    description: "Beta tester role",
    createdAt: new Date(),
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

    discordService = {
      assignRoleToUser: jest.fn(),
      sendDirectMessage: jest.fn(),
      fetchUser: jest.fn(),
      fetchGuildMember: jest.fn(),
      hasRole: jest.fn(),
      fetchChannel: jest.fn(),
    };

    useCase = new GrantRewardUseCase(
      userRepository,
      levelRepository,
      rewardRepository,
      discordService
    );
  });

  describe("execute", () => {
    it("메시지 작성 시 사용자 포인트를 정상적으로 증가시켜야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const username = "testuser";
      const globalName = "Test User";
      const channelId = "987654321";
      const eventType = "message";

      userRepository.findOrCreate.mockResolvedValue(mockUser);
      rewardRepository.getRewardableChannel.mockResolvedValue(mockChannel);
      userRepository.updatePoints.mockResolvedValue({
        ...mockUser,
        currentReward: 11,
      });
      levelRepository.calculateLevelFromReward.mockResolvedValue(1);
      rewardRepository.createRewardHistory.mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 1,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });

      // When (실행)
      const result = await useCase.execute(
        discordId,
        username,
        globalName,
        channelId,
        eventType
      );

      // Then (검증)
      expect(userRepository.findOrCreate).toHaveBeenCalledWith({
        discordId,
        username,
        globalName,
      });
      expect(rewardRepository.getRewardableChannel).toHaveBeenCalledWith(
        channelId
      );
      expect(userRepository.updatePoints).toHaveBeenCalledWith(1, 11);
      expect(rewardRepository.createRewardHistory).toHaveBeenCalledWith({
        discordUserId: 1,
        amount: 1,
        type: "message",
        reason: "message 활동 보상",
        discordEventId: undefined,
      });
      expect(levelRepository.calculateLevelFromReward).toHaveBeenCalledWith(11);
      expect(result).toEqual({
        success: true,
        rewardAmount: 1,
        newTotalReward: 11,
        leveledUp: false,
        newLevel: undefined,
        assignedRoleId: undefined,
      });
    });

    it("레벨업 시 역할을 부여하고 DM을 전송해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const username = "testuser";
      const globalName = "Test User";
      const channelId = "987654321";
      const eventType = "forum_post";

      userRepository.findOrCreate.mockResolvedValue(mockUser);
      rewardRepository.getRewardableChannel.mockResolvedValue(mockChannel);
      userRepository.updatePoints.mockResolvedValue({
        ...mockUser,
        currentReward: 13,
      });
      levelRepository.calculateLevelFromReward.mockResolvedValue(2); // 레벨 업!
      levelRepository.getRoleForLevel.mockResolvedValue(mockRole);
      levelRepository.findByLevelNumber.mockResolvedValue({
        id: 2,
        levelNumber: 2,
        requiredRewardAmount: 5,
        levelName: "Regular",
        discordRoleTableId: 1,
        createdAt: new Date(),
      });
      rewardRepository.createRewardHistory.mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 3,
        type: "forum_post",
        reason: "forum_post 활동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });
      discordService.assignRoleToUser.mockResolvedValue();
      discordService.sendDirectMessage.mockResolvedValue(true);

      // When (실행)
      const result = await useCase.execute(
        discordId,
        username,
        globalName,
        channelId,
        eventType
      );

      // Then (검증)
      expect(userRepository.updateLevel).toHaveBeenCalledWith(1, 2);
      expect(levelRepository.getRoleForLevel).toHaveBeenCalledWith(2);
      expect(discordService.assignRoleToUser).toHaveBeenCalledWith(
        discordId,
        mockRole.discordRoleId
      );
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        discordId,
        "🎉 축하합니다! 레벨 2(Regular)에 도달했습니다!"
      );
      expect(result).toEqual({
        success: true,
        rewardAmount: 3,
        newTotalReward: 13,
        leveledUp: true,
        newLevel: 2,
        assignedRoleId: mockRole.discordRoleId,
      });
    });

    it("보상 대상이 아닌 채널에서는 보상을 지급하지 않아야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const username = "testuser";
      const globalName = "Test User";
      const channelId = "987654321";
      const eventType = "message";

      userRepository.findOrCreate.mockResolvedValue(mockUser);
      rewardRepository.getRewardableChannel.mockResolvedValue(null); // 보상 대상 채널 없음

      // When (실행)
      const result = await useCase.execute(
        discordId,
        username,
        globalName,
        channelId,
        eventType
      );

      // Then (검증)
      expect(userRepository.findOrCreate).toHaveBeenCalledWith({
        discordId,
        username,
        globalName,
      });
      expect(rewardRepository.getRewardableChannel).toHaveBeenCalledWith(
        channelId
      );
      expect(userRepository.updatePoints).not.toHaveBeenCalled();
      expect(rewardRepository.createRewardHistory).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        rewardAmount: 0,
        newTotalReward: mockUser.currentReward,
        leveledUp: false,
      });
    });

    it("비활성화된 채널에서는 보상을 지급하지 않아야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const username = "testuser";
      const globalName = "Test User";
      const channelId = "987654321";
      const eventType = "message";

      userRepository.findOrCreate.mockResolvedValue(mockUser);
      rewardRepository.getRewardableChannel.mockResolvedValue({
        ...mockChannel,
        isActive: false, // 비활성화된 채널
      });

      // When (실행)
      const result = await useCase.execute(
        discordId,
        username,
        globalName,
        channelId,
        eventType
      );

      // Then (검증)
      expect(result).toEqual({
        success: false,
        rewardAmount: 0,
        newTotalReward: mockUser.currentReward,
        leveledUp: false,
      });
    });
  });

  describe("executeManualReward", () => {
    it("수동 보상을 정상적으로 지급해야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const amount = 5;
      const reason = "관리자 수동 보상";

      userRepository.findByDiscordId.mockResolvedValue(mockUser);
      userRepository.updatePoints.mockResolvedValue({
        ...mockUser,
        currentReward: 15,
      });
      levelRepository.calculateLevelFromReward.mockResolvedValue(1);
      rewardRepository.createRewardHistory.mockResolvedValue({
        id: 1,
        discordUserId: 1,
        amount: 5,
        type: "manual",
        reason: "관리자 수동 보상",
        discordEventId: null,
        createdAt: new Date(),
      });

      // When (실행)
      const result = await useCase.executeManualReward(
        discordId,
        amount,
        reason
      );

      // Then (검증)
      expect(userRepository.findByDiscordId).toHaveBeenCalledWith(discordId);
      expect(userRepository.updatePoints).toHaveBeenCalledWith(1, 15);
      expect(rewardRepository.createRewardHistory).toHaveBeenCalledWith({
        discordUserId: 1,
        amount: 5,
        type: "manual",
        reason: "관리자 수동 보상",
      });
      expect(result).toEqual({
        success: true,
        rewardAmount: 5,
        newTotalReward: 15,
        leveledUp: false,
        newLevel: undefined,
        assignedRoleId: undefined,
      });
    });

    it("존재하지 않는 사용자에게는 수동 보상을 지급할 수 없어야 한다", async () => {
      // Given (준비)
      const discordId = "123456789";
      const amount = 5;
      const reason = "관리자 수동 보상";

      userRepository.findByDiscordId.mockResolvedValue(null); // 사용자 없음

      // When & Then (실행 및 검증)
      await expect(
        useCase.executeManualReward(discordId, amount, reason)
      ).rejects.toThrow("사용자를 찾을 수 없습니다.");
    });
  });
});
