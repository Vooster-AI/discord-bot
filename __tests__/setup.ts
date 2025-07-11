// Jest 테스트 환경 설정
import { jest } from "@jest/globals";

// 글로벌 설정
global.console = {
  ...console,
  // 테스트 중 로그를 숨기려면 주석 해제
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

// 환경 변수 설정
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-token";
process.env.DISCORD_CLIENT_ID = "test-client-id";
process.env.DISCORD_GUILD_ID = "test-guild-id";
process.env.DATABASE_URL = "test-database-url";
