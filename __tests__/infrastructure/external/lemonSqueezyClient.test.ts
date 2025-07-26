import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LemonSqueezyClient } from "../../../src/infrastructure/external/lemonSqueezyClient.js";

// 환경 변수 모킹
vi.mock("../../../src/config.js", () => ({
  LEMONSQUEEZY_API_KEY: "test-api-key",
  LEMONSQUEEZY_STORE_ID: "test-store-id",
  LEMONSQUEEZY_PRO_VARIANT_ID: "test-pro-variant-id",
  LEMONSQUEEZY_MAX5_VARIANT_ID: "test-max5-variant-id",
  LEMONSQUEEZY_MAX20_VARIANT_ID: "test-max20-variant-id",
}));

// fetch 모킹
global.fetch = vi.fn();

describe("LemonSqueezyClient", () => {
  let client: LemonSqueezyClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LemonSqueezyClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createDiscount", () => {
    it("할인 쿠폰을 성공적으로 생성해야 함", async () => {
      const mockResponse = {
        data: {
          id: "1",
          attributes: {
            code: "TESTCODE123",
            name: "Test Discount",
            amount: 100,
            amount_type: "percent",
          },
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createDiscount({
        name: "Test Discount",
        code: "TESTCODE123",
        amount: 100,
        amountType: "percent",
      });

      expect(result).toBe("TESTCODE123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.lemonsqueezy.com/v1/discounts",
        expect.objectContaining({
          method: "POST",
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: "Bearer test-api-key",
          },
        })
      );
    });

    it("특정 제품에 제한된 할인 쿠폰을 생성해야 함", async () => {
      const mockResponse = {
        data: {
          id: "1",
          attributes: {
            code: "PRODUCTCODE123",
          },
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createDiscount({
        name: "Product Discount",
        code: "PRODUCTCODE123",
        amount: 50,
        amountType: "percent",
        variantId: "variant-123",
        isLimitedToProducts: true,
      });

      expect(result).toBe("PRODUCTCODE123");

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      
      expect(body.data.attributes.is_limited_to_products).toBe(true);
      expect(body.data.relationships.variants).toEqual({
        data: [
          {
            type: "variants",
            id: "variant-123",
          },
        ],
      });
    });

    it("API 오류 시 에러를 던져야 함", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      } as Response);

      await expect(
        client.createDiscount({
          name: "Test",
          code: "TEST",
          amount: 100,
          amountType: "percent",
        })
      ).rejects.toThrow("Lemon Squeezy API 오류: 400 - Bad Request");
    });
  });

  describe("createMvpCoupons", () => {
    it("MVP 쿠폰 3개를 성공적으로 생성해야 함", async () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      const mockResponses = [
        { data: { attributes: { code: `MVPPRO${mockTimestamp}` } } },
        { data: { attributes: { code: `MVPMAX5${mockTimestamp}` } } },
        { data: { attributes: { code: `MVPMAX20${mockTimestamp}` } } },
      ];

      mockResponses.forEach((response) => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => response,
        } as Response);
      });

      const result = await client.createMvpCoupons("user123");

      expect(result).toEqual({
        proCoupon: `MVPPRO${mockTimestamp}`,
        max5Coupon: `MVPMAX5${mockTimestamp}`,
        max20Coupon: `MVPMAX20${mockTimestamp}`,
      });

      // 3번의 API 호출 확인
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // 각 호출의 파라미터 확인
      const calls = vi.mocked(global.fetch).mock.calls;
      
      // Pro 쿠폰 호출
      const proBody = JSON.parse(calls[0][1]?.body as string);
      expect(proBody.data.attributes.name).toBe("MVP Pro Coupon - user123");
      expect(proBody.data.attributes.amount).toBe(100);
      expect(proBody.data.relationships.variants.data[0].id).toBe("test-pro-variant-id");

      // Max5 쿠폰 호출
      const max5Body = JSON.parse(calls[1][1]?.body as string);
      expect(max5Body.data.attributes.name).toBe("MVP Max5 Coupon - user123");
      expect(max5Body.data.relationships.variants.data[0].id).toBe("test-max5-variant-id");

      // Max20 쿠폰 호출
      const max20Body = JSON.parse(calls[2][1]?.body as string);
      expect(max20Body.data.attributes.name).toBe("MVP Max20 Coupon - user123");
      expect(max20Body.data.relationships.variants.data[0].id).toBe("test-max20-variant-id");
    });

    it("하나의 쿠폰 생성 실패 시 에러를 전파해야 함", async () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      // 첫 번째는 성공
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { attributes: { code: `MVPPRO${mockTimestamp}` } } }),
      } as Response);

      // 두 번째는 실패
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      await expect(client.createMvpCoupons("user123")).rejects.toThrow(
        "Lemon Squeezy API 오류: 500 - Internal Server Error"
      );
    });
  });

  describe("constructor", () => {
    it("API 키가 없으면 에러를 던져야 함", () => {
      // config 모듈 재모킹
      vi.doMock("../../../src/config.js", () => ({
        LEMONSQUEEZY_API_KEY: undefined,
        LEMONSQUEEZY_STORE_ID: "test-store-id",
        LEMONSQUEEZY_PRO_VARIANT_ID: "test-pro-variant-id",
        LEMONSQUEEZY_MAX5_VARIANT_ID: "test-max5-variant-id",
        LEMONSQUEEZY_MAX20_VARIANT_ID: "test-max20-variant-id",
      }));

      expect(() => new LemonSqueezyClient()).toThrow(
        "LEMONSQUEEZY_API_KEY가 설정되지 않았습니다."
      );
    });
  });
});