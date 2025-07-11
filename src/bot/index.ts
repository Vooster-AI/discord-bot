import { Client, GatewayIntentBits, Events } from "discord.js";
import { DISCORD_TOKEN } from "../config";
import { connectDatabase } from "../utils/prisma";
import readyEventHandler from "./events/ready";
import messageCreateHandler from "./events/messageCreate";
import threadCreateHandler from "./events/threadCreate";
import interactionCreateHandler from "./events/interactionCreate";

// 필요한 intents 목록
const requiredIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

// Discord 클라이언트 생성
const client = new Client({
  intents: requiredIntents,
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

// 연결 상태 로깅
client.on("shardError", (error) => {
  console.error("[Bot] Discord WebSocket 연결 오류:", error);
});

client.on("shardDisconnect", (event, id) => {
  console.warn(`[Bot] Discord WebSocket 연결 해제 (Shard ${id}):`, event);
});

client.on("shardReconnecting", (id) => {
  console.log(`[Bot] Discord WebSocket 재연결 시도 중 (Shard ${id})`);
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
    console.log("=".repeat(60));
    console.log("[Bot] Discord 봇 시작 중...");
    console.log("=".repeat(60));

    // Intents 정보 출력
    console.log("[Bot] 🔧 설정된 Intents:");
    requiredIntents.forEach((intent) => {
      const intentName = Object.keys(GatewayIntentBits).find(
        (key) =>
          GatewayIntentBits[key as keyof typeof GatewayIntentBits] === intent
      );
      console.log(`  - ${intentName}`);
    });
    console.log("");

    // 중요한 Intents 활성화 안내
    console.log(
      "[Bot] ⚠️ 중요: Discord Developer Portal에서 다음 Intents를 활성화해야 합니다:"
    );
    console.log("  - MESSAGE CONTENT INTENT (메시지 내용 읽기용)");
    console.log("  - SERVER MEMBERS INTENT (멤버 정보 접근용)");
    console.log(
      "  - Bot 설정 URL: https://discord.com/developers/applications"
    );
    console.log("");

    console.log("[Bot] 데이터베이스 연결 중...");
    await connectDatabase();
    console.log("[Bot] ✅ 데이터베이스 연결 완료");

    console.log("[Bot] Discord 봇 로그인 중...");
    await client.login(DISCORD_TOKEN);

    console.log("[Bot] ✅ 봇이 성공적으로 시작되었습니다.");
  } catch (error) {
    console.error("=".repeat(60));
    console.error("[Bot] 🚨 봇 시작 오류:", error);

    // 일반적인 오류 해결 방법 안내
    if (error instanceof Error) {
      if (error.message.includes("disallowed intents")) {
        console.error("");
        console.error("🔧 해결 방법:");
        console.error(
          "1. Discord Developer Portal (https://discord.com/developers/applications) 접속"
        );
        console.error("2. 해당 애플리케이션 선택");
        console.error("3. 'Bot' 탭으로 이동");
        console.error(
          "4. 'Privileged Gateway Intents' 섹션에서 다음 항목들 체크:"
        );
        console.error("   - MESSAGE CONTENT INTENT");
        console.error("   - SERVER MEMBERS INTENT");
        console.error("5. 설정 저장 후 봇 재시작");
      } else if (error.message.includes("invalid token")) {
        console.error("");
        console.error("🔧 해결 방법:");
        console.error("1. .env 파일의 DISCORD_TOKEN 값 확인");
        console.error("2. Discord Developer Portal에서 새 토큰 재발급");
        console.error("3. 토큰 앞뒤 공백 제거 확인");
      }
    }

    console.error("=".repeat(60));
    process.exit(1);
  }
}

// 클라이언트 인스턴스 내보내기
export { client };
