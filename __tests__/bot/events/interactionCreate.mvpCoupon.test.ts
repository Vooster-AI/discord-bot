import { describe, it, expect, vi, beforeEach } from "vitest";
import interactionCreateHandler from "../../../src/bot/events/interactionCreate.js";

// 의존성 모킹
vi.mock("../../../src/services/userService.js", () => ({
  UserService: {
    getUserData: vi.fn(),
    findOrCreateUser: vi.fn(),
  },
}));

vi.mock("../../../src/services/levelService.js", () => ({
  LevelService: {},
}));

vi.mock("../../../src/services/rewardService.js", () => ({
  RewardService: {},
}));

// MvpCouponService 모킹
vi.mock("../../../src/application/services/mvpCouponService.js");

// CommandableChannelService 모킹
vi.mock("../../../src/application/services/CommandableChannelService.js");

// Repository 모킹
vi.mock("../../../src/infrastructure/persistence/PrismaCommandableChannelRepository.js", () => ({
  PrismaCommandableChannelRepository: vi.fn(),
}));

// Prisma 모킹
vi.mock("../../../src/utils/prisma.js", () => ({
  prisma: {},
}));

// Mock Discord.js EmbedBuilder
const mockEmbedBuilder = {
  setTitle: vi.fn().mockReturnThis(),
  setDescription: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  setFooter: vi.fn().mockReturnThis(),
  setTimestamp: vi.fn().mockReturnThis(),
  addFields: vi.fn().mockReturnThis(),
};

vi.mock("discord.js", async () => {
  const actual = await vi.importActual("discord.js");
  return {
    ...actual,
    EmbedBuilder: vi.fn(() => mockEmbedBuilder),
  };
});

import { MvpCouponService } from "../../../src/application/services/mvpCouponService.js";
import { CommandableChannelService } from "../../../src/application/services/CommandableChannelService.js";

describe("MVP Coupon Command", () => {
  let mockInteraction: any;
  let mockCheckUserEligibility: any;
  let mockGetOrCreateCoupons: any;
  let mockIsChannelCommandable: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock 함수 생성
    mockCheckUserEligibility = vi.fn();
    mockGetOrCreateCoupons = vi.fn();
    mockIsChannelCommandable = vi.fn().mockResolvedValue(true);
    
    // MvpCouponService 모킹
    vi.mocked(MvpCouponService).mockImplementation(() => ({
      checkUserEligibility: mockCheckUserEligibility,
      getOrCreateCoupons: mockGetOrCreateCoupons,
    }) as any);
    
    // CommandableChannelService 모킹
    vi.mocked(CommandableChannelService).mockImplementation(() => ({
      isChannelCommandable: mockIsChannelCommandable,
    }) as any);

    mockInteraction = {
      isChatInputCommand: () => true,
      commandName: "mvp-coupon",
      user: {
        id: "123456789",
        tag: "testuser#0001",
        displayAvatarURL: () => "https://example.com/avatar.png",
      },
      channelId: "test-channel-id",
      member: {
        roles: {
          cache: {
            has: vi.fn(),
          },
        },
      },
      deferReply: vi.fn(),
      followUp: vi.fn(),
      reply: vi.fn(),
      replied: false,
      client: {
        user: {
          displayAvatarURL: () => "https://example.com/bot-avatar.png",
        },
      },
    };
  });

  it("MVP 역할이 없으면 오류 메시지를 반환해야 함", async () => {
    mockInteraction.member.roles.cache.has.mockReturnValue(false);

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "이 명령어는 Beta MVP 역할을 가진 사용자만 사용할 수 있습니다.",
      ephemeral: true,
    });
  });

  it("member가 없으면 권한 확인 오류를 반환해야 함", async () => {
    mockInteraction.member = null;

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "권한을 확인할 수 없습니다.",
      ephemeral: true,
    });
  });

  it("member.roles가 문자열이면 권한 확인 오류를 반환해야 함", async () => {
    mockInteraction.member = { roles: "invalid" };

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "권한을 확인할 수 없습니다.",
      ephemeral: true,
    });
  });

  it("member.roles가 배열이면 권한 확인 오류를 반환해야 함", async () => {
    mockInteraction.member = { roles: [] };

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "권한을 확인할 수 없습니다.",
      ephemeral: true,
    });
  });

  it("사용자가 자격 요건을 충족하지 않으면 오류를 반환해야 함", async () => {
    mockInteraction.member.roles.cache.has.mockReturnValue(true);
    mockCheckUserEligibility.mockResolvedValue({
      isEligible: false,
      error: "Vooster 이메일이 등록되어 있지 않습니다.",
    });

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "Vooster 이메일이 등록되어 있지 않습니다.",
      ephemeral: true,
    });
  });

  it("쿠폰을 성공적으로 발급해야 함", async () => {
    mockInteraction.member.roles.cache.has.mockReturnValue(true);
    mockCheckUserEligibility.mockResolvedValue({
      isEligible: true,
    });
    mockGetOrCreateCoupons.mockResolvedValue({
      proCoupon: "MVPPRO123456",
      max5Coupon: "MVPMAX5123456",
      max20Coupon: "MVPMAX20123456",
    });

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockInteraction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [mockEmbedBuilder],
        ephemeral: true,
      })
    );
    expect(mockEmbedBuilder.setTitle).toHaveBeenCalledWith("🎟️ Beta MVP 쿠폰");
    expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "🚀 Pro 플랜 쿠폰",
        value: "`MVPPRO123456`",
      }),
      expect.objectContaining({
        name: "📊 Max5 플랜 쿠폰",
        value: "`MVPMAX5123456`",
      }),
      expect.objectContaining({
        name: "🏆 Max20 플랜 쿠폰",
        value: "`MVPMAX20123456`",
      })
    );
  });

  it("기존 쿠폰을 반환해야 함", async () => {
    mockInteraction.member.roles.cache.has.mockReturnValue(true);
    mockCheckUserEligibility.mockResolvedValue({
      isEligible: true,
    });
    mockGetOrCreateCoupons.mockResolvedValue({
      proCoupon: "EXISTINGPRO",
      max5Coupon: "EXISTINGMAX5",
      max20Coupon: "EXISTINGMAX20",
    });

    await interactionCreateHandler(mockInteraction);

    expect(mockGetOrCreateCoupons).toHaveBeenCalledWith("123456789");
    expect(mockInteraction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [mockEmbedBuilder],
        ephemeral: true,
      })
    );
  });

  it("서비스 오류 시 에러 메시지를 반환해야 함", async () => {
    mockInteraction.member.roles.cache.has.mockReturnValue(true);
    mockCheckUserEligibility.mockResolvedValue({
      isEligible: true,
    });
    mockGetOrCreateCoupons.mockRejectedValue(
      new Error("API 오류")
    );

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: "쿠폰 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      ephemeral: true,
    });
  });

  it("봇 사용 불가능한 채널에서는 오류를 반환해야 함", async () => {
    mockIsChannelCommandable.mockResolvedValue(false);

    await interactionCreateHandler(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: "봇사용채널에서 호출해주세요.",
      ephemeral: true,
    });
  });
});