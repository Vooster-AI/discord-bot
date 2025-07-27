import { LemonSqueezyClient } from "../../infrastructure/external/lemonSqueezyClient.js";
import { prisma } from "../../utils/prisma.js";
import axios from "axios";

export class MvpCouponService {
  private lemonSqueezyClient: LemonSqueezyClient;

  constructor() {
    this.lemonSqueezyClient = new LemonSqueezyClient();
  }

  async checkUserEligibility(discordId: string): Promise<{
    isEligible: boolean;
    error?: string;
    voosterEmail?: string;
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

    // Vooster 이메일 유효성 검증
    try {
      const apiUrl = process.env.API_URL;
      if (!apiUrl) {
        console.error("API_URL 환경 변수가 설정되지 않았습니다.");
        return { isEligible: true, voosterEmail: user.voosterEmail };
      }

      const response = await axios.post(
        `${apiUrl}/check-email-exists`,
        { email: user.voosterEmail },
        {
          headers: {
            Authorization: `Bearer ${process.env.DISCORD_BOT_API_SECRET}`,
          },
        }
      );

      if (!response.data.exists) {
        return {
          isEligible: false,
          error: "등록된 Vooster 이메일이 유효하지 않습니다. 올바른 이메일로 다시 등록해주세요.",
        };
      }
    } catch (error) {
      console.error("이메일 검증 중 오류 발생:", error);
      // API 오류 시 기본적으로 통과시킴
    }

    return { isEligible: true, voosterEmail: user.voosterEmail };
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

  async markUserAsBetaMvp(voosterEmail: string): Promise<void> {
    try {
      const apiUrl = process.env.API_URL;
      if (!apiUrl) {
        console.error("API_URL 환경 변수가 설정되지 않았습니다.");
        return;
      }

      await axios.post(
        `${apiUrl}/mark-as-beta-mvp`,
        { email: voosterEmail },
        {
          headers: {
            Authorization: `Bearer ${process.env.DISCORD_BOT_API_SECRET}`,
          },
        }
      );
      
      console.log(`Beta MVP 마킹 완료: ${voosterEmail}`);
    } catch (error) {
      console.error("Beta MVP 마킹 중 오류 발생:", error);
      // 마킹 실패해도 쿠폰 발급은 진행
    }
  }
}
