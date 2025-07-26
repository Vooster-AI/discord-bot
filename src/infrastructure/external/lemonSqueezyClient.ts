import { LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_PRO_VARIANT_ID, LEMONSQUEEZY_MAX5_VARIANT_ID, LEMONSQUEEZY_MAX20_VARIANT_ID } from "../../config.js";

interface CreateDiscountParams {
  name: string;
  code: string;
  amount: number;
  amountType: "percent" | "fixed";
  variantId?: string;
  isLimitedToProducts?: boolean;
}

interface DiscountResponse {
  data: {
    id: string;
    attributes: {
      code: string;
      [key: string]: any;
    };
  };
}

export class LemonSqueezyClient {
  private readonly apiKey: string;
  private readonly apiUrl = "https://api.lemonsqueezy.com/v1";

  constructor() {
    if (!LEMONSQUEEZY_API_KEY) {
      throw new Error("LEMONSQUEEZY_API_KEY가 설정되지 않았습니다.");
    }
    this.apiKey = LEMONSQUEEZY_API_KEY;
  }

  async createDiscount(params: CreateDiscountParams): Promise<string> {
    const payload: any = {
      data: {
        type: "discounts",
        attributes: {
          name: params.name,
          code: params.code,
          amount: params.amount,
          amount_type: params.amountType,
          is_limited_to_products: params.isLimitedToProducts || false,
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: LEMONSQUEEZY_STORE_ID,
            },
          },
        },
      },
    };

    if (params.isLimitedToProducts && params.variantId) {
      payload.data.relationships.variants = {
        data: [
          {
            type: "variants",
            id: params.variantId,
          },
        ],
      };
    }

    const response = await fetch(`${this.apiUrl}/discounts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lemon Squeezy API 오류: ${response.status} - ${error}`);
    }

    const result = (await response.json()) as DiscountResponse;
    return result.data.attributes.code;
  }

  async createMvpCoupons(userId: string): Promise<{
    proCoupon: string;
    max5Coupon: string;
    max20Coupon: string;
  }> {
    const timestamp = Date.now();
    
    // Pro 쿠폰 생성 (100% 할인)
    const proCoupon = await this.createDiscount({
      name: `MVP Pro Coupon - ${userId}`,
      code: `MVPPRO${timestamp}`,
      amount: 100,
      amountType: "percent",
      variantId: LEMONSQUEEZY_PRO_VARIANT_ID,
      isLimitedToProducts: true,
    });

    // Max5 쿠폰 생성 (100% 할인)
    const max5Coupon = await this.createDiscount({
      name: `MVP Max5 Coupon - ${userId}`,
      code: `MVPMAX5${timestamp}`,
      amount: 100,
      amountType: "percent",
      variantId: LEMONSQUEEZY_MAX5_VARIANT_ID,
      isLimitedToProducts: true,
    });

    // Max20 쿠폰 생성 (100% 할인)
    const max20Coupon = await this.createDiscount({
      name: `MVP Max20 Coupon - ${userId}`,
      code: `MVPMAX20${timestamp}`,
      amount: 100,
      amountType: "percent",
      variantId: LEMONSQUEEZY_MAX20_VARIANT_ID,
      isLimitedToProducts: true,
    });

    return {
      proCoupon,
      max5Coupon,
      max20Coupon,
    };
  }
}