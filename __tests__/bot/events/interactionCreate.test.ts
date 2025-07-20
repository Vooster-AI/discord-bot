import { describe, it, expect, vi, beforeEach } from "vitest";
import { Interaction } from "discord.js";
import interactionCreateHandler from "../../../src/bot/events/interactionCreate.js";
import { UserService } from "../../../src/services/userService.js";
import { LevelService } from "../../../src/services/levelService.js";

// 의존성 모킹
vi.mock("../../../src/services/userService.js", () => ({
  UserService: {
    getUserData: vi.fn(),
    getUserRanking: vi.fn(),
    getLeaderboard: vi.fn(),
    getUserRewardHistory: vi.fn(),
    updateVoosterEmail: vi.fn(),
    findOrCreateUser: vi.fn(), // 추가
  },
}));

vi.mock("../../../src/services/levelService.js", () => ({
  LevelService: {
    getCurrentLevel: vi.fn(),
    getNextLevel: vi.fn(),
    calculateProgress: vi.fn(),
    getAllLevels: vi.fn(),
  },
}));

// CommandableChannelService 모킹
vi.mock("../../../src/application/services/CommandableChannelService.js", () => ({
  CommandableChannelService: vi.fn().mockImplementation(() => ({
    isChannelCommandable: vi.fn().mockResolvedValue(true),
  })),
}));

// Repository 모킹
vi.mock("../../../src/infrastructure/persistence/PrismaCommandableChannelRepository.js", () => ({
  PrismaCommandableChannelRepository: vi.fn().mockImplementation(() => ({
    getAllActiveChannels: vi.fn(),
    isChannelCommandable: vi.fn(),
  })),
}));

// Prisma 모킹
vi.mock("../../../src/utils/prisma.js", () => ({
  prisma: {},
}));

// Mock Discord.js EmbedBuilder
vi.mock("discord.js", async () => {
  const actual = await vi.importActual("discord.js");
  return {
    ...actual,
    EmbedBuilder: vi.fn().mockImplementation(() => ({
      setTitle: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setThumbnail: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      setFooter: vi.fn().mockReturnThis(),
      setTimestamp: vi.fn().mockReturnThis(),
      addFields: vi.fn().mockReturnThis(),
      data: {
        title: "",
        fields: [],
      },
    })),
  };
});

describe("InteractionCreate Event Handler", () => {
  let mockInteraction: any;
  let mockUser: any;

  beforeEach(() => {
    // 기본 mock 설정
    mockUser = {
      id: "123456789",
      tag: "testuser#0001",
      username: "testuser",
      globalName: "Test User",
      displayAvatarURL: () => "https://example.com/avatar.png",
    };

    mockInteraction = {
      isChatInputCommand: () => true,
      commandName: "level",
      user: mockUser,
      channelId: "test-channel-id",
      options: {
        getUser: vi.fn(),
        getString: vi.fn(),
      },
      reply: vi.fn(),
      deferReply: vi.fn(),
      followUp: vi.fn(),
      deferred: false,
      client: {
        user: {
          displayAvatarURL: () => "https://example.com/bot-avatar.png",
        },
      },
    };

    // 모든 mock 초기화
    vi.clearAllMocks();
  });

  describe("/level command", () => {
    it("should reply with user level information when user exists", async () => {
      // Arrange
      const mockUserData = {
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: "https://example.com/avatar.png",
        currentLevel: 2,
        currentReward: 10,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCurrentLevel = {
        id: 2,
        levelNumber: 2,
        requiredRewardAmount: 5,
        levelName: "Regular",
        discordRoleTableId: null,
        createdAt: new Date(),
      };

      const mockNextLevel = {
        id: 3,
        levelNumber: 3,
        requiredRewardAmount: 15,
        levelName: "Beta MVP",
        discordRoleTableId: 1,
        createdAt: new Date(),
      };

      const mockProgress = {
        currentLevelReward: 5,
        nextLevelReward: 15,
        progress: 5,
        progressPercentage: 50.0,
      };

      mockInteraction.commandName = "level";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(null);

      const mockRanking = {
        rank: 1,
        totalUsers: 10,
        percentile: 90,
      };

      vi.mocked(UserService.getUserData).mockResolvedValue(mockUserData);
      vi.mocked(UserService.getUserRanking).mockResolvedValue(mockRanking);
      vi.mocked(LevelService.getCurrentLevel).mockResolvedValue(
        mockCurrentLevel
      );
      vi.mocked(LevelService.getNextLevel).mockResolvedValue(mockNextLevel);
      vi.mocked(LevelService.calculateProgress).mockResolvedValue(mockProgress);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getUserData).toHaveBeenCalledWith("123456789");
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });

    it("should create new user and reply with default level information when user does not exist", async () => {
      // Arrange
      const mockNewUser = {
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: "https://example.com/avatar.png",
        currentLevel: 1,
        currentReward: 0,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCurrentLevel = {
        id: 1,
        levelNumber: 1,
        requiredRewardAmount: 0,
        levelName: "Newbie",
        discordRoleTableId: null,
        createdAt: new Date(),
      };

      const mockNextLevel = {
        id: 2,
        levelNumber: 2,
        requiredRewardAmount: 5,
        levelName: "Regular",
        discordRoleTableId: null,
        createdAt: new Date(),
      };

      const mockProgress = {
        currentLevelReward: 0,
        nextLevelReward: 5,
        progress: 0,
        progressPercentage: 0.0,
      };

      mockInteraction.commandName = "level";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(null);

      const mockRanking = {
        rank: 1,
        totalUsers: 1,
        percentile: 100,
      };

      // getUserData는 null을 반환하고, findOrCreateUser가 신규 사용자를 생성
      vi.mocked(UserService.getUserData).mockResolvedValue(null);
      vi.mocked(UserService.findOrCreateUser).mockResolvedValue(mockNewUser);
      vi.mocked(UserService.getUserRanking).mockResolvedValue(mockRanking);
      vi.mocked(LevelService.getCurrentLevel).mockResolvedValue(
        mockCurrentLevel
      );
      vi.mocked(LevelService.getNextLevel).mockResolvedValue(mockNextLevel);
      vi.mocked(LevelService.calculateProgress).mockResolvedValue(mockProgress);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getUserData).toHaveBeenCalledWith("123456789");
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith("123456789", {
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });
  });

  describe("/history command", () => {
    it("should reply with user reward history when user exists", async () => {
      // Arrange
      const mockRewardHistory = [
        {
          id: 1,
          amount: 5,
          type: "message",
          reason: null,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          event: {
            channelId: "987654321",
            content: "This is a test message content",
            eventType: "message",
          },
        },
        {
          id: 2,
          amount: 10,
          type: "forum_post",
          reason: null,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          event: {
            channelId: "987654322",
            content: "This is a forum post content",
            eventType: "forum_post",
          },
        },
      ];

      mockInteraction.commandName = "history";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(mockUser);

      vi.mocked(UserService.getUserRewardHistory).mockResolvedValue(
        mockRewardHistory
      );

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getUserRewardHistory).toHaveBeenCalledWith(
        "123456789",
        5
      );
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });

    it("should create new user and reply with no history message when user does not exist", async () => {
      // Arrange
      const mockNewUser = {
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: "https://example.com/avatar.png",
        currentLevel: 1,
        currentReward: 0,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      mockInteraction.commandName = "history";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(null);

      // getUserRewardHistory는 빈 배열을 반환하고, findOrCreateUser가 신규 사용자를 생성
      vi.mocked(UserService.getUserRewardHistory).mockResolvedValue([]);
      vi.mocked(UserService.findOrCreateUser).mockResolvedValue(mockNewUser);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getUserRewardHistory).toHaveBeenCalledWith(
        "123456789",
        5
      );
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith("123456789", {
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content:
          "아직 리워드 내역이 없습니다. 메시지를 작성하거나 포럼에 참여해보세요!",
        ephemeral: true,
      });
    });

    it("should reply with no history message when user has no reward history", async () => {
      // Arrange
      mockInteraction.commandName = "history";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(null);

      vi.mocked(UserService.getUserRewardHistory).mockResolvedValue([]);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getUserRewardHistory).toHaveBeenCalledWith(
        "123456789",
        5
      );
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content:
          "아직 리워드 내역이 없습니다. 메시지를 작성하거나 포럼에 참여해보세요!",
        ephemeral: true,
      });
    });
  });

  describe("/top command", () => {
    it("should reply with leaderboard of top 10 users", async () => {
      // Arrange
      const mockLeaderboard = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        discordId: `user${i + 1}`,
        username: `user${i + 1}`,
        globalName: `User ${i + 1}`,
        discriminator: null,
        avatarUrl: null,
        currentLevel: 5 - Math.floor(i / 2),
        currentReward: 100 - i * 10,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      }));

      mockInteraction.commandName = "top";

      vi.mocked(UserService.getLeaderboard).mockResolvedValue(mockLeaderboard);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getLeaderboard).toHaveBeenCalledWith(10);
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });

    it("should show correct number of users in leaderboard", async () => {
      // Arrange
      const mockLeaderboard = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        discordId: `user${i + 1}`,
        username: `user${i + 1}`,
        globalName: `User ${i + 1}`,
        discriminator: null,
        avatarUrl: null,
        currentLevel: 5,
        currentReward: 100 - i * 10,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      }));

      mockInteraction.commandName = "top";

      vi.mocked(UserService.getLeaderboard).mockResolvedValue(mockLeaderboard);

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(UserService.getLeaderboard).toHaveBeenCalledWith(10);
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });
  });

  describe("/levels command", () => {
    it("should respond with level requirements information", async () => {
      // Arrange
      const mockLevels = [
        {
          id: 1,
          levelNumber: 1,
          requiredRewardAmount: 0,
          levelName: "Newbie",
          discordRoleTableId: null,
          createdAt: new Date(),
        },
        {
          id: 2,
          levelNumber: 2,
          requiredRewardAmount: 5,
          levelName: "Regular",
          discordRoleTableId: null,
          createdAt: new Date(),
        },
        {
          id: 3,
          levelNumber: 3,
          requiredRewardAmount: 15,
          levelName: "Beta MVP",
          discordRoleTableId: 1,
          createdAt: new Date(),
        },
      ];

      vi.mocked(LevelService.getAllLevels).mockResolvedValue(mockLevels);

      mockInteraction.commandName = "levels";

      // Act
      await interactionCreateHandler(mockInteraction as any);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
      });
    });

    it("should handle error when fetching levels", async () => {
      // Arrange
      vi.mocked(LevelService.getAllLevels).mockRejectedValue(
        new Error("Database error")
      );

      mockInteraction.commandName = "levels";

      // Act
      mockInteraction.deferred = true; // deferReply 후 상태 시뮬레이션
      await interactionCreateHandler(mockInteraction as any);

      // Assert
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    });
  });

  describe("/help command", () => {
    it("should respond with list of available commands", async () => {
      // Arrange
      mockInteraction.commandName = "help";

      // Act
      await interactionCreateHandler(mockInteraction as any);

      // Assert
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
      });
    });
  });

  describe("unknown command", () => {
    it("should reply with an error message for unknown commands", async () => {
      // Arrange
      mockInteraction.commandName = "unknown";

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "알 수 없는 명령어입니다.",
        ephemeral: true,
      });
    });
  });
});
