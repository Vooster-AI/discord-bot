// Vitest 테스트 환경 설정
import { vi } from "vitest";

// Prisma 클라이언트 모킹
vi.mock("../src/utils/prisma.ts", () => {
  return {
    prisma: {
      // 여기에 Prisma 모델별로 필요한 메서드들을 모킹할 수 있습니다.
      // 테스트 파일에서 개별적으로 모킹할 것이므로 여기선 비워둡니다.
    },
  };
});

// Discord.js 모킹
vi.mock("discord.js", () => ({
  Client: vi.fn(),
  GatewayIntentBits: {},
  Events: {},
  EmbedBuilder: vi.fn(),
  SlashCommandBuilder: vi.fn(),
  Collection: vi.fn(),
  REST: vi.fn(),
  Routes: vi.fn(),
}));

// 환경 변수 설정
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-token";
process.env.DISCORD_CLIENT_ID = "test-client-id";
process.env.DISCORD_GUILD_ID = "test-guild-id";
process.env.DATABASE_URL = "test-database-url";
