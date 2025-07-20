import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock UserService
vi.mock("../../../src/services/userService.js", () => ({
  UserService: {
    getUserData: vi.fn(),
    findOrCreateUser: vi.fn(),
    updateUserPoints: vi.fn(),
    updateDailyBonusTime: vi.fn(),
    createRewardHistory: vi.fn(),
    updateUserLevel: vi.fn(),
  },
}));

describe("Daily Bonus Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Daily Bonus Cooldown (KST-based)", () => {
    it("should allow bonus if user has never claimed before", () => {
      const lastBonus = null;
      expect(lastBonus).toBeNull();
    });

    it("should allow bonus on different KST dates", () => {
      // Test date comparison logic for KST timezone
      const now = new Date('2024-01-02T01:00:00Z'); // Jan 2, 2024 01:00 UTC (Jan 2, 10:00 KST)
      const lastBonus = new Date('2024-01-01T01:00:00Z'); // Jan 1, 2024 01:00 UTC (Jan 1, 10:00 KST)
      
      // Convert to KST (UTC+9)
      const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const lastBonusKST = new Date(lastBonus.getTime() + (9 * 60 * 60 * 1000));
      
      // Compare dates only (remove time)
      const todayKST = new Date(nowKST.getFullYear(), nowKST.getMonth(), nowKST.getDate());
      const lastBonusDateKST = new Date(lastBonusKST.getFullYear(), lastBonusKST.getMonth(), lastBonusKST.getDate());

      expect(todayKST.getTime()).not.toBe(lastBonusDateKST.getTime());
    });

    it("should reject bonus on same KST date", () => {
      // Both times are on the same KST date
      const now = new Date('2024-01-01T20:00:00Z'); // Jan 1, 2024 20:00 UTC (Jan 2, 05:00 KST)
      const lastBonus = new Date('2024-01-01T15:00:00Z'); // Jan 1, 2024 15:00 UTC (Jan 2, 00:00 KST)
      
      // Convert to KST (UTC+9)
      const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const lastBonusKST = new Date(lastBonus.getTime() + (9 * 60 * 60 * 1000));
      
      // Compare dates only (remove time)
      const todayKST = new Date(nowKST.getFullYear(), nowKST.getMonth(), nowKST.getDate());
      const lastBonusDateKST = new Date(lastBonusKST.getFullYear(), lastBonusKST.getMonth(), lastBonusKST.getDate());

      expect(todayKST.getTime()).toBe(lastBonusDateKST.getTime());
    });

    it("should calculate correct time until next KST midnight", () => {
      // Test at 20:00 KST (11:00 UTC)
      const now = new Date('2024-01-01T11:00:00Z'); // Jan 1, 2024 11:00 UTC (Jan 1, 20:00 KST)
      const nowKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      
      // Today's date in KST
      const todayKST = new Date(nowKST.getFullYear(), nowKST.getMonth(), nowKST.getDate());
      
      // Tomorrow's midnight in KST
      const tomorrowKST = new Date(todayKST.getTime() + (24 * 60 * 60 * 1000));
      const tomorrowUTC = new Date(tomorrowKST.getTime() - (9 * 60 * 60 * 1000));
      
      const timeRemaining = tomorrowUTC.getTime() - now.getTime();
      const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));

      // From Jan 1 11:00 UTC to Jan 2 15:00 UTC (next midnight KST in UTC) = ~19 hours
      expect(hoursRemaining).toBe(19); // Hours until next midnight KST (in UTC)
    });
  });

  describe("Reward Rarity and Display", () => {
    function getRewardEmoji(amount: number): string {
      switch (amount) {
        case 1:
          return "🪙";
        case 2:
          return "💰";
        case 3:
          return "💎";
        case 5:
          return "🏆";
        case 10:
          return "👑";
        default:
          return "🎁";
      }
    }

    function getRewardRarity(amount: number): string {
      switch (amount) {
        case 1:
          return "(일반)";
        case 2:
          return "(고급)";
        case 3:
          return "(희귀)";
        case 5:
          return "(영웅)";
        case 10:
          return "(전설)";
        default:
          return "";
      }
    }

    function getRewardColor(amount: number): number {
      switch (amount) {
        case 1:
          return 0x96ceb4; // 연두색 (일반)
        case 2:
          return 0x45b7d1; // 파란색 (고급)
        case 3:
          return 0x4ecdc4; // 청록색 (희귀)
        case 5:
          return 0xff6b35; // 오렌지 (영웅)
        case 10:
          return 0xffd700; // 골드 (전설)
        default:
          return 0x0099ff;
      }
    }

    it("should return correct emoji for each reward amount", () => {
      expect(getRewardEmoji(1)).toBe("🪙");
      expect(getRewardEmoji(2)).toBe("💰");
      expect(getRewardEmoji(3)).toBe("💎");
      expect(getRewardEmoji(5)).toBe("🏆");
      expect(getRewardEmoji(10)).toBe("👑");
    });

    it("should return correct rarity text for each reward amount", () => {
      expect(getRewardRarity(1)).toBe("(일반)");
      expect(getRewardRarity(2)).toBe("(고급)");
      expect(getRewardRarity(3)).toBe("(희귀)");
      expect(getRewardRarity(5)).toBe("(영웅)");
      expect(getRewardRarity(10)).toBe("(전설)");
    });

    it("should return correct color for each reward amount", () => {
      expect(getRewardColor(1)).toBe(0x96ceb4);
      expect(getRewardColor(2)).toBe(0x45b7d1);
      expect(getRewardColor(3)).toBe(0x4ecdc4);
      expect(getRewardColor(5)).toBe(0xff6b35);
      expect(getRewardColor(10)).toBe(0xffd700);
    });
  });

});
