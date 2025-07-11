import { describe, it, expect, beforeEach, vi } from "vitest";
import { DiscordService } from "../../src/services/discordService";

// Mock dependencies
vi.mock("../../src/utils/prisma", () => ({
  prisma: {
    discordEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    discordUser: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

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

vi.mock("../../src/services/userService", () => ({
  UserService: {
    findOrCreateUser: vi.fn(),
  },
}));

vi.mock("../../src/services/rewardService", () => ({
  RewardService: {
    processReward: vi.fn(),
  },
}));

describe("Discord Migration API - 중복 방지", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DiscordService.fetchPastMessages 메서드에 중복 방지 로직이 있는지 확인", async () => {
    // Arrange
    const { client } = await import("../../src/bot");
    const { prisma } = await import("../../src/utils/prisma");
    const { UserService } = await import("../../src/services/userService");
    const { RewardService } = await import("../../src/services/rewardService");

    // Mock된 메시지 데이터
    const mockMessages = new Map();
    mockMessages.set("message-1", {
      id: "message-1",
      content: "Test message",
      author: {
        id: "user-1",
        username: "testuser",
        globalName: "Test User",
        discriminator: "1234",
        displayAvatarURL: () => "avatar-url",
        bot: false,
      },
      createdAt: new Date("2024-01-01T00:00:00Z"),
      channel: {
        id: "test-channel-id",
        isThread: () => false,
      },
    });

    // lastKey 메서드 추가
    (mockMessages as any).lastKey = () => "message-1";

    const mockChannel = {
      id: "test-channel-id",
      isTextBased: () => true,
      isThread: () => false,
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessages),
      },
    };

    (client.channels.fetch as any).mockResolvedValue(mockChannel);

    // 이미 존재하는 메시지로 설정
    (prisma.discordEvent.findFirst as any).mockResolvedValue({
      id: 1,
      messageId: "message-1",
    });

    (UserService.findOrCreateUser as any).mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    (RewardService.processReward as any).mockResolvedValue(undefined);

    // Act
    await DiscordService.fetchPastMessages("test-channel-id", 10);

    // Assert
    // 중복 체크가 호출되었는지 확인
    expect(prisma.discordEvent.findFirst).toHaveBeenCalledWith({
      where: { messageId: "message-1" },
    });

    // 이미 존재하는 메시지이므로 새로 생성되지 않아야 함
    expect(prisma.discordEvent.create).not.toHaveBeenCalled();

    // 이미 존재하는 메시지이므로 보상 처리도 하지 않아야 함
    expect(RewardService.processReward).not.toHaveBeenCalled();
  });

  it("DiscordService.fetchForumPosts 메서드에 중복 방지 로직이 있는지 확인", async () => {
    // Arrange
    const { client } = await import("../../src/bot");
    const { prisma } = await import("../../src/utils/prisma");
    const { UserService } = await import("../../src/services/userService");

    const mockThread = {
      id: "thread-1",
      name: "Test Thread",
      ownerId: "user-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    };

    const mockForumChannel = {
      id: "forum-channel-id",
      type: 15, // GuildForum
      threads: {
        fetchActive: vi.fn().mockResolvedValue({
          threads: new Map([["thread-1", mockThread]]),
        }),
        fetchArchived: vi.fn().mockResolvedValue({
          threads: new Map(),
        }),
      },
    };

    (client.channels.fetch as any).mockResolvedValue(mockForumChannel);
    (client.users.fetch as any).mockResolvedValue({
      id: "user-1",
      username: "testuser",
      globalName: "Test User",
      discriminator: "1234",
      displayAvatarURL: () => "avatar-url",
    });

    // 이미 존재하는 포럼 게시물로 설정
    (prisma.discordEvent.findFirst as any).mockResolvedValue({
      id: 1,
      messageId: "thread-1",
    });

    (UserService.findOrCreateUser as any).mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    // fetchPastMessages 호출을 Mock
    const fetchPastMessagesSpy = vi
      .spyOn(DiscordService, "fetchPastMessages")
      .mockResolvedValue(undefined);

    // Act
    await DiscordService.fetchForumPosts("forum-channel-id", 10);

    // Assert
    // 중복 체크가 호출되었는지 확인
    expect(prisma.discordEvent.findFirst).toHaveBeenCalledWith({
      where: { messageId: "thread-1" },
    });

    // 이미 존재하는 포럼 게시물이므로 새로 생성되지 않아야 함
    expect(prisma.discordEvent.create).not.toHaveBeenCalled();

    // 이미 존재하는 포럼 게시물이므로 스레드 메시지 처리도 하지 않아야 함
    expect(fetchPastMessagesSpy).not.toHaveBeenCalled();

    // Cleanup
    fetchPastMessagesSpy.mockRestore();
  });

  it("새로운 메시지는 정상적으로 처리되어야 함", async () => {
    // Arrange
    const { client } = await import("../../src/bot");
    const { prisma } = await import("../../src/utils/prisma");
    const { UserService } = await import("../../src/services/userService");
    const { RewardService } = await import("../../src/services/rewardService");

    const mockMessages = new Map();
    mockMessages.set("message-1", {
      id: "message-1",
      content: "Test message",
      author: {
        id: "user-1",
        username: "testuser",
        globalName: "Test User",
        discriminator: "1234",
        displayAvatarURL: () => "avatar-url",
        bot: false,
      },
      createdAt: new Date("2024-01-01T00:00:00Z"),
      channel: {
        id: "test-channel-id",
        isThread: () => false,
      },
    });

    (mockMessages as any).lastKey = () => "message-1";

    const mockChannel = {
      id: "test-channel-id",
      isTextBased: () => true,
      isThread: () => false,
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessages),
      },
    };

    (client.channels.fetch as any).mockResolvedValue(mockChannel);

    // 새로운 메시지 (존재하지 않음)
    (prisma.discordEvent.findFirst as any).mockResolvedValue(null);

    (UserService.findOrCreateUser as any).mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    (prisma.discordEvent.create as any).mockResolvedValue({
      id: 1,
      messageId: "message-1",
    });

    (RewardService.processReward as any).mockResolvedValue(undefined);

    // Act
    await DiscordService.fetchPastMessages("test-channel-id", 10);

    // Assert
    // 중복 체크가 호출되었는지 확인
    expect(prisma.discordEvent.findFirst).toHaveBeenCalledWith({
      where: { messageId: "message-1" },
    });

    // 새로운 메시지이므로 저장되어야 함
    expect(prisma.discordEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.discordEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        messageId: "message-1",
      }),
    });

    // 새로운 메시지이므로 보상 처리도 되어야 함
    expect(RewardService.processReward).toHaveBeenCalledTimes(1);
  });
});
