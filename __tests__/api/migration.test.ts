import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscordService } from "../../src/services/discordService";
import { RewardService } from "../../src/services/rewardService";
import { UserService } from "../../src/services/userService";
import { client } from "../../src/bot";

// Mock dependencies
vi.mock("../../src/bot", () => ({
  client: {
    channels: {
      fetch: vi.fn(),
    },
    users: {
      fetch: vi.fn(),
    },
  },
}));

vi.mock("../../src/utils/prisma", () => ({
  prisma: {
    discordEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../src/services/userService", () => ({
  UserService: {
    findOrCreateUser: vi.fn(),
  },
}));

vi.mock("../../src/services/rewardService", () => ({
  RewardService: {
    processRewardWithDate: vi.fn(),
  },
}));

describe("마이그레이션 - 2배 보상 기능", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPastMessages", () => {
    it("2025년 7월 9일 오후 6:53분(KST) 이전 메시지에 대해 processRewardWithDate를 호출해야 한다", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const oldMessageDate = new Date("2025-07-09T09:00:00.000Z"); // 6:53 이전
      const newMessageDate = new Date("2025-07-09T10:00:00.000Z"); // 6:53 이후

      const mockChannel = {
        id: channelId,
        isTextBased: () => true,
        isThread: () => false,
        messages: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce(
              (() => {
                const map = new Map([
                  [
                    "old-message-id",
                    {
                      id: "old-message-id",
                      author: {
                        id: "user-1",
                        username: "testuser",
                        globalName: "Test User",
                        discriminator: "1234",
                        displayAvatarURL: () => "avatar-url",
                        bot: false,
                      },
                      content: "Old message content",
                      createdAt: oldMessageDate,
                      system: false,
                      channel: {
                        id: channelId,
                        isThread: () => false,
                      },
                    },
                  ],
                  [
                    "new-message-id",
                    {
                      id: "new-message-id",
                      author: {
                        id: "user-2",
                        username: "testuser2",
                        globalName: "Test User 2",
                        discriminator: "5678",
                        displayAvatarURL: () => "avatar-url-2",
                        bot: false,
                      },
                      content: "New message content",
                      createdAt: newMessageDate,
                      system: false,
                      channel: {
                        id: channelId,
                        isThread: () => false,
                      },
                    },
                  ],
                ]);
                // lastKey 메서드 추가
                (map as any).lastKey = () => "new-message-id";
                return map;
              })()
            )
            .mockResolvedValueOnce(
              (() => {
                const map = new Map();
                (map as any).lastKey = () => undefined;
                return map;
              })()
            ),
        },
      };

      const mockUser = { id: 1 };
      const mockEvent = { id: 1 };

      (client.channels.fetch as any).mockResolvedValue(mockChannel);
      (UserService.findOrCreateUser as any).mockResolvedValue(mockUser);

      const { prisma } = await import("../../src/utils/prisma");
      (prisma.discordEvent.findFirst as any).mockResolvedValue(null);
      (prisma.discordEvent.create as any).mockResolvedValue(mockEvent);

      // Act
      await DiscordService.fetchPastMessages(channelId, 10);

      // Assert
      expect(RewardService.processRewardWithDate).toHaveBeenCalledTimes(2);

      // 첫 번째 호출 (이전 메시지)
      expect(RewardService.processRewardWithDate).toHaveBeenNthCalledWith(
        1,
        mockUser.id,
        channelId,
        "message",
        oldMessageDate,
        mockEvent.id
      );

      // 두 번째 호출 (이후 메시지)
      expect(RewardService.processRewardWithDate).toHaveBeenNthCalledWith(
        2,
        mockUser.id,
        channelId,
        "message",
        newMessageDate,
        mockEvent.id
      );
    });

    it("봇 메시지나 시스템 메시지는 처리하지 않아야 한다", async () => {
      // Arrange
      const channelId = "test-channel-id";

      const mockChannel = {
        id: channelId,
        isTextBased: () => true,
        isThread: () => false,
        messages: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce(
              (() => {
                const map = new Map([
                  [
                    "bot-message-id",
                    {
                      id: "bot-message-id",
                      author: {
                        id: "bot-user-id",
                        username: "bot",
                        bot: true,
                      },
                      content: "Bot message",
                      createdAt: new Date(),
                      system: false,
                      channel: {
                        id: channelId,
                        isThread: () => false,
                      },
                    },
                  ],
                  [
                    "system-message-id",
                    {
                      id: "system-message-id",
                      author: {
                        id: "system-user-id",
                        username: "system",
                        bot: false,
                      },
                      content: "System message",
                      createdAt: new Date(),
                      system: true,
                      channel: {
                        id: channelId,
                        isThread: () => false,
                      },
                    },
                  ],
                ]);
                // lastKey 메서드 추가
                (map as any).lastKey = () => "system-message-id";
                return map;
              })()
            )
            .mockResolvedValueOnce(
              (() => {
                const map = new Map();
                (map as any).lastKey = () => undefined;
                return map;
              })()
            ),
        },
      };

      (client.channels.fetch as any).mockResolvedValue(mockChannel);

      // Act
      await DiscordService.fetchPastMessages(channelId, 10);

      // Assert
      expect(RewardService.processRewardWithDate).not.toHaveBeenCalled();
      expect(UserService.findOrCreateUser).not.toHaveBeenCalled();
    });
  });

  describe("fetchForumPosts", () => {
    it("2025년 7월 9일 오후 6:53분(KST) 이전 포럼 게시물에 대해 processRewardWithDate를 호출해야 한다", async () => {
      // Arrange
      const channelId = "forum-channel-id";
      const oldPostDate = new Date("2025-07-09T09:00:00.000Z"); // 6:53 이전

      const mockForumChannel = {
        id: channelId,
        type: 15, // ChannelType.GuildForum
        threads: {
          fetchActive: vi.fn().mockResolvedValue({
            threads: new Map([
              [
                "thread-1",
                {
                  id: "thread-1",
                  ownerId: "user-1",
                  name: "Test Forum Post",
                  createdAt: oldPostDate,
                },
              ],
            ]),
          }),
          fetchArchived: vi.fn().mockResolvedValue({
            threads: new Map(),
          }),
        },
      };

      const mockUser = { id: 1 };
      const mockEvent = { id: 1 };
      const mockOwner = {
        id: "user-1",
        username: "testuser",
        globalName: "Test User",
        discriminator: "1234",
        displayAvatarURL: () => "avatar-url",
      };

      (client.channels.fetch as any).mockResolvedValue(mockForumChannel);
      (client.users.fetch as any).mockResolvedValue(mockOwner);
      (UserService.findOrCreateUser as any).mockResolvedValue(mockUser);

      const { prisma } = await import("../../src/utils/prisma");
      (prisma.discordEvent.findFirst as any).mockResolvedValue(null);
      (prisma.discordEvent.create as any).mockResolvedValue(mockEvent);

      // Mock fetchPastMessages를 호출하지 않도록 설정
      vi.spyOn(DiscordService, "fetchPastMessages").mockResolvedValue(
        undefined
      );

      // Act
      await DiscordService.fetchForumPosts(channelId, 10);

      // Assert
      expect(RewardService.processRewardWithDate).toHaveBeenCalledWith(
        mockUser.id,
        channelId,
        "forum_post",
        oldPostDate,
        mockEvent.id
      );
    });
  });
});
