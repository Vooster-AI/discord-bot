import { LemonSqueezyClient } from "../../infrastructure/external/lemonSqueezyClient.js";
import { prisma } from "../../utils/prisma.js";

export class MvpCouponService {
  private lemonSqueezyClient: LemonSqueezyClient;

  constructor() {
    this.lemonSqueezyClient = new LemonSqueezyClient();
  }

  async checkUserEligibility(discordId: string): Promise<{
    isEligible: boolean;
    error?: string;
  }> {
    const user = await prisma.discordUser.findUnique({
      where: { discordId },
    });

    if (!user) {
      return {
        isEligible: false,
        error: "사용자를 찾을 수 없습니다.",
      };
    }

    if (!user.voosterEmail) {
      return {
        isEligible: false,
        error:
          "Vooster 이메일이 등록되어 있지 않습니다. `/vooster-check` 명령어를 사용해 이메일을 등록해주세요.",
      };
    }

    return { isEligible: true };
  }

  async getOrCreateCoupons(discordId: string): Promise<{
    proCoupon: string;
    max5Coupon: string;
    max20Coupon: string;
  }> {
    const user = await prisma.discordUser.findUnique({
      where: { discordId },
      include: { betaMvpCoupon: true },
    });

    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    // 이미 쿠폰이 존재하는 경우
    if (user.betaMvpCoupon) {
      return {
        proCoupon: user.betaMvpCoupon.proCouponCode,
        max5Coupon: user.betaMvpCoupon.max5CouponCode,
        max20Coupon: user.betaMvpCoupon.max20CouponCode,
      };
    }

    // 새로운 쿠폰 생성
    const coupons = await this.lemonSqueezyClient.createMvpCoupons(discordId);

    // DB에 저장
    await prisma.betaMvpCoupon.create({
      data: {
        discordUserId: user.id,
        proCouponCode: coupons.proCoupon,
        max5CouponCode: coupons.max5Coupon,
        max20CouponCode: coupons.max20Coupon,
      },
    });

    return coupons;
  }
}
