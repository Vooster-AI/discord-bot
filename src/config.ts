import dotenv from "dotenv";
dotenv.config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
export const DATABASE_URL = process.env.DATABASE_URL!;
export const PORT = process.env.PORT || "3000";
export const API_SECRET_KEY = process.env.API_SECRET_KEY!;

// 환경 변수 검증
const requiredEnvVars = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  DATABASE_URL,
  API_SECRET_KEY,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`필수 환경 변수가 누락되었습니다: ${key}`);
  }
}

console.log("[Config] 환경 변수 설정이 완료되었습니다.");
