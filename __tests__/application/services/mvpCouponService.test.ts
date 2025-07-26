import { describe, it, expect, vi, beforeEach } from "vitest";
import { MvpCouponService } from "../../../src/application/services/mvpCouponService.js";
import { prisma } from "../../../src/utils/prisma.js";

vi.mock("../../../src/utils/prisma.js", () => ({
  prisma: {
    discordUser: {
      findUnique: vi.fn(),
    },
    betaMvpCoupon: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../src/infrastructure/external/lemonSqueezyClient.js", () => ({
  LemonSqueezyClient: vi.fn().mockImplementation(() => ({
    createMvpCoupons: vi.fn().mockResolvedValue({
      proCoupon: "MVPPRO123456",
      max5Coupon: "MVPMAX5123456",
      max20Coupon: "MVPMAX20123456",
    }),
  })),
}));

describe("MvpCouponService", () => {
  let service: MvpCouponService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MvpCouponService();
  });

  describe("checkUserEligibility", () => {
    it("사용자가 존재하지 않으면 false를 반환해야 함", async () => {
      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue(null);

      const result = await service.checkUserEligibility("123456789");

      expect(result).toEqual({
        isEligible: false,
        error: "사용자를 찾을 수 없습니다.",
      });
    });

    it("Vooster 이메일이 등록되지 않았으면 false를 반환해야 함", async () => {
      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue({
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: null,
        currentReward: 0,
        currentLevel: 1,
        voosterEmail: null,
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.checkUserEligibility("123456789");

      expect(result).toEqual({
        isEligible: false,
        error:
          "Vooster 이메일이 등록되어 있지 않습니다. `/vooster-check` 명령어를 사용해 이메일을 등록해주세요.",
      });
    });

    it("모든 조건을 충족하면 true를 반환해야 함", async () => {
      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue({
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: null,
        currentReward: 0,
        currentLevel: 1,
        voosterEmail: "test@example.com",
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.checkUserEligibility("123456789");

      expect(result).toEqual({ isEligible: true });
    });
  });

  describe("getOrCreateCoupons", () => {
    it("기존 쿠폰이 있으면 반환해야 함", async () => {
      const mockUser = {
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: null,
        currentReward: 0,
        currentLevel: 1,
        voosterEmail: "test@example.com",
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
        betaMvpCoupon: {
          id: 1,
          discordUserId: 1,
          proCouponCode: "EXISTINGPRO",
          max5CouponCode: "EXISTINGMAX5",
          max20CouponCode: "EXISTINGMAX20",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue(mockUser);

      const result = await service.getOrCreateCoupons("123456789");

      expect(result).toEqual({
        proCoupon: "EXISTINGPRO",
        max5Coupon: "EXISTINGMAX5",
        max20Coupon: "EXISTINGMAX20",
      });
    });

    it("새로운 쿠폰을 생성해야 함", async () => {
      const mockUser = {
        id: 1,
        discordId: "123456789",
        username: "testuser",
        globalName: "Test User",
        discriminator: null,
        avatarUrl: null,
        currentReward: 0,
        currentLevel: 1,
        voosterEmail: "test@example.com",
        lastDailyBonus: null,
        joinedAt: new Date(),
        updatedAt: new Date(),
        betaMvpCoupon: null,
      };

      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.betaMvpCoupon.create).mockResolvedValue({
        id: 1,
        discordUserId: 1,
        proCouponCode: "MVPPRO123456",
        max5CouponCode: "MVPMAX5123456",
        max20CouponCode: "MVPMAX20123456",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getOrCreateCoupons("123456789");

      expect(result).toEqual({
        proCoupon: "MVPPRO123456",
        max5Coupon: "MVPMAX5123456",
        max20Coupon: "MVPMAX20123456",
      });

      expect(prisma.betaMvpCoupon.create).toHaveBeenCalledWith({
        data: {
          discordUserId: 1,
          proCouponCode: "MVPPRO123456",
          max5CouponCode: "MVPMAX5123456",
          max20CouponCode: "MVPMAX20123456",
        },
      });
    });

    it("사용자가 없으면 에러를 던져야 함", async () => {
      vi.mocked(prisma.discordUser.findUnique).mockResolvedValue(null);

      await expect(service.getOrCreateCoupons("123456789")).rejects.toThrow(
        "사용자를 찾을 수 없습니다."
      );
    });
  });
});