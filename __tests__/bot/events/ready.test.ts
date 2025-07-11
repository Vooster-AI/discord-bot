import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client, ActivityType, ChannelType } from "discord.js";
import readyEventHandler from "../../../src/bot/events/ready";

// Collection 모킹 클래스
class MockCollection extends Map {
  filter(fn: (value: any) => boolean) {
    const filtered = new MockCollection();
    for (const [key, value] of this.entries()) {
      if (fn(value)) {
        filtered.set(key, value);
      }
    }
    return filtered;
  }

  get size() {
    return super.size;
  }

  forEach(
    fn: (value: any, key: any, map: Map<any, any>) => void,
    thisArg?: any
  ) {
    super.forEach(fn, thisArg);
  }
}

describe("Ready Event Handler", () => {
  let mockClient: Partial<Client>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockClient = {
      user: {
        tag: "TestBot#1234",
        id: "123456789",
        setActivity: vi.fn(),
      },
      guilds: {
        cache: new MockCollection(),
      },
      users: {
        cache: new MockCollection(),
      },
      channels: {
        cache: new MockCollection(),
      },
    } as any;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("봇이 준비되었을 때 기본 정보를 로그로 출력한다", () => {
    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "봇이 준비되었습니다! TestBot#1234로 로그인했습니다."
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("봇 ID: 123456789")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("현재 시간:")
    );
  });

  it("봇 상태를 설정한다", () => {
    readyEventHandler(mockClient as Client);

    expect(mockClient.user?.setActivity).toHaveBeenCalledWith(
      "Discord 서버 모니터링",
      { type: ActivityType.Watching }
    );
  });

  it("전체 통계 정보를 출력한다", () => {
    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("📊 전체 통계:")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("연결된 서버 수: 0")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("캐시된 사용자 수: 0")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("캐시된 채널 수: 0")
    );
  });

  it("연결된 서버가 없을 때 경고 메시지를 출력한다", () => {
    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ 연결된 서버가 없습니다.")
    );
  });

  it("길드 정보를 상세히 출력한다", () => {
    const mockGuild = {
      id: "guild123",
      name: "Test Guild",
      memberCount: 100,
      channels: { cache: new MockCollection() },
      roles: { cache: new MockCollection() },
      createdAt: new Date("2023-01-01"),
      ownerId: "owner123",
      members: {
        me: {
          permissions: {
            toArray: vi
              .fn()
              .mockReturnValue(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"]),
          },
        },
      },
    };

    const mockTextChannel = {
      id: "text123",
      name: "general",
      type: ChannelType.GuildText,
    };

    const mockForumChannel = {
      id: "forum123",
      name: "help-forum",
      type: ChannelType.GuildForum,
    };

    mockGuild.channels.cache.set("text123", mockTextChannel);
    mockGuild.channels.cache.set("forum123", mockForumChannel);

    (mockClient.guilds!.cache as any).set("guild123", mockGuild);

    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("🏰 연결된 서버 목록:")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("1. Test Guild")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("서버 ID: guild123")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("멤버 수: 100명")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("텍스트 채널 목록 (1개):")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("• general (text123)")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("포럼 채널 목록 (1개):")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("• help-forum (forum123)")
    );
  });

  it("길드의 역할 정보를 출력한다", () => {
    const mockGuild = {
      id: "guild123",
      name: "Test Guild",
      memberCount: 100,
      channels: { cache: new MockCollection() },
      roles: { cache: new MockCollection() },
      createdAt: new Date("2023-01-01"),
      ownerId: "owner123",
      members: {
        me: {
          permissions: {
            toArray: vi
              .fn()
              .mockReturnValue(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"]),
          },
        },
      },
    };

    const mockRole1 = {
      id: "role123",
      name: "Admin",
      hexColor: "#FF0000",
      members: { size: 5 },
    };

    const mockRole2 = {
      id: "role456",
      name: "Member",
      hexColor: "#00FF00",
      members: { size: 50 },
    };

    // @everyone 역할 (길드 ID와 동일)
    const mockEveryoneRole = {
      id: "guild123",
      name: "@everyone",
      hexColor: "#000000",
      members: { size: 100 },
    };

    mockGuild.roles.cache.set("role123", mockRole1);
    mockGuild.roles.cache.set("role456", mockRole2);
    mockGuild.roles.cache.set("guild123", mockEveryoneRole);

    (mockClient.guilds!.cache as any).set("guild123", mockGuild);

    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("역할 목록 (2개, @everyone 제외):")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("• Admin (role123) - 색상: #FF0000 - 멤버: 5명")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("• Member (role456) - 색상: #00FF00 - 멤버: 50명")
    );
  });

  it("역할이 없을 때 @everyone 역할만 있는 경우 역할 목록을 출력하지 않는다", () => {
    const mockGuild = {
      id: "guild123",
      name: "Test Guild",
      memberCount: 100,
      channels: { cache: new MockCollection() },
      roles: { cache: new MockCollection() },
      createdAt: new Date("2023-01-01"),
      ownerId: "owner123",
      members: {
        me: {
          permissions: {
            toArray: vi
              .fn()
              .mockReturnValue(["SEND_MESSAGES", "READ_MESSAGE_HISTORY"]),
          },
        },
      },
    };

    // @everyone 역할만 있는 경우
    const mockEveryoneRole = {
      id: "guild123",
      name: "@everyone",
      hexColor: "#000000",
      members: { size: 100 },
    };

    mockGuild.roles.cache.set("guild123", mockEveryoneRole);

    (mockClient.guilds!.cache as any).set("guild123", mockGuild);

    readyEventHandler(mockClient as Client);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("역할 목록")
    );
  });

  it("성공 메시지를 출력한다", () => {
    readyEventHandler(mockClient as Client);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("✅ 봇이 모든 서버에 성공적으로 연결되었습니다!")
    );
  });
});
