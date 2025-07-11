import { Client, GatewayIntentBits, Events } from "discord.js";
import { DISCORD_TOKEN } from "../config";
import { connectDatabase } from "../utils/prisma";
import readyEventHandler from "./events/ready";
import messageCreateHandler from "./events/messageCreate";
import threadCreateHandler from "./events/threadCreate";
import interactionCreateHandler from "./events/interactionCreate";

// Discord 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// 이벤트 핸들러 등록
client.once(Events.ClientReady, readyEventHandler);
client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.ThreadCreate, threadCreateHandler);
client.on(Events.InteractionCreate, interactionCreateHandler);

// 에러 핸들링
client.on("error", (error) => {
  console.error("[Bot] Discord 클라이언트 오류:", error);
});

client.on("warn", (warning) => {
  console.warn("[Bot] Discord 클라이언트 경고:", warning);
});

// 프로세스 종료 시 클라이언트 정리
process.on("SIGINT", async () => {
  console.log("[Bot] 봇 종료 중...");
  client.destroy();
  process.exit(0);
});

// 봇 시작 함수
export async function startBot(): Promise<void> {
  try {
    console.log("[Bot] 데이터베이스 연결 중...");
    await connectDatabase();

    console.log("[Bot] Discord 봇 로그인 중...");
    await client.login(DISCORD_TOKEN);

    console.log("[Bot] 봇이 성공적으로 시작되었습니다.");
  } catch (error) {
    console.error("[Bot] 봇 시작 오류:", error);
    process.exit(1);
  }
}

// 클라이언트 인스턴스 내보내기
export { client };
