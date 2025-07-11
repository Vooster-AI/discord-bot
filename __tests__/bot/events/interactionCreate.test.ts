import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Interaction,
  ChatInputCommandInteraction,
  User,
  EmbedBuilder,
} from "discord.js";
import interactionCreateHandler from "../../../src/bot/events/interactionCreate";
import { UserService } from "../../../src/services/userService";

// Mock the services and discord client
vi.mock("../../../src/services/userService");
vi.mock("../../../src/services/levelService");
vi.mock("../../../src/bot/index", () => ({
  default: {},
}));

// Mock Discord.js EmbedBuilder
vi.mock("discord.js", async () => {
  const actual = await vi.importActual("discord.js");
  return {
    ...actual,
    EmbedBuilder: vi.fn().mockImplementation(() => ({
      setTitle: vi.fn().mockReturnThis(),
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

describe("interactionCreate event handler", () => {
  let mockInteraction: any;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = {
      id: "123456789",
      username: "testuser",
      globalName: "Test User",
      tag: "testuser#0001",
      displayAvatarURL: vi
        .fn()
        .mockReturnValue("https://example.com/avatar.png"),
    };

    mockInteraction = {
      isChatInputCommand: vi.fn().mockReturnValue(true),
      commandName: "",
      user: mockUser,
      options: {
        getUser: vi.fn(),
        getString: vi.fn(),
      },
      reply: vi.fn(),
      replied: false,
      client: {
        user: {
          displayAvatarURL: vi
            .fn()
            .mockReturnValue("https://example.com/bot-avatar.png"),
        },
      },
    };
  });

  describe("/history command", () => {
    it("should reply with user reward history when user exists", async () => {
      // Arrange
      const mockRewardHistory = [
        {
          id: 1,
          amount: 5,
          type: "message",
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

      const getUserRewardHistoryMock = vi
        .fn()
        .mockResolvedValue(mockRewardHistory);
      vi.mocked(UserService).getUserRewardHistory = getUserRewardHistoryMock;

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(getUserRewardHistoryMock).toHaveBeenCalledWith("123456789", 5);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });

    it("should reply with no history message when user has no reward history", async () => {
      // Arrange
      mockInteraction.commandName = "history";
      mockInteraction.options.getUser = vi.fn().mockReturnValue(null);

      const getUserRewardHistoryMock = vi.fn().mockResolvedValue([]);
      vi.mocked(UserService).getUserRewardHistory = getUserRewardHistoryMock;

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(getUserRewardHistoryMock).toHaveBeenCalledWith("123456789", 5);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "리워드 내역이 없습니다.",
        ephemeral: true,
      });
    });
  });

  describe("/top command", () => {
    it("should reply with leaderboard of top 10 users", async () => {
      // Arrange
      const mockLeaderboard = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        globalName: `User ${i + 1}`,
        currentLevel: 5 - Math.floor(i / 2),
        currentReward: 100 - i * 10,
      }));

      mockInteraction.commandName = "top";

      const getLeaderboardMock = vi.fn().mockResolvedValue(mockLeaderboard);
      vi.mocked(UserService).getLeaderboard = getLeaderboardMock;

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(getLeaderboardMock).toHaveBeenCalledWith(10);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });

    it("should show correct number of users in leaderboard", async () => {
      // Arrange
      const mockLeaderboard = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        globalName: `User ${i + 1}`,
        currentLevel: 5,
        currentReward: 100 - i * 10,
      }));

      mockInteraction.commandName = "top";

      const getLeaderboardMock = vi.fn().mockResolvedValue(mockLeaderboard);
      vi.mocked(UserService).getLeaderboard = getLeaderboardMock;

      // Act
      await interactionCreateHandler(mockInteraction as Interaction);

      // Assert
      expect(getLeaderboardMock).toHaveBeenCalledWith(10);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(Object)]),
      });
    });
  });
});
