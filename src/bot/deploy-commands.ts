import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { DISCORD_CLIENT_ID, DISCORD_GUILD_ID, DISCORD_TOKEN } from "../config";

// 슬래시 커맨드 정의
const commands = [
  new SlashCommandBuilder()
    .setName("level")
    .setDescription("사용자의 레벨 정보를 확인합니다.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("레벨을 확인할 사용자")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("리더보드를 확인합니다."),

  new SlashCommandBuilder()
    .setName("vooster")
    .setDescription("Vooster 이메일을 등록합니다.")
    .addStringOption((option) =>
      option
        .setName("email")
        .setDescription("등록할 Vooster 이메일 주소")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

// Discord REST API 클라이언트 생성
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

// 슬래시 커맨드 배포 함수
async function deployCommands(): Promise<void> {
  try {
    console.log("[Deploy] 슬래시 커맨드 배포를 시작합니다...");
    console.log(`[Deploy] 총 ${commands.length}개의 명령어를 배포합니다.`);

    // 길드 전용 명령어로 배포 (테스트 용도)
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );

    console.log("[Deploy] 길드 슬래시 커맨드 배포 완료!");

    // 전역 명령어로 배포하려면 아래 코드 사용 (배포 후 최대 1시간 소요)
    // await rest.put(
    //     Routes.applicationCommands(DISCORD_CLIENT_ID),
    //     { body: commands }
    // );
    // console.log('[Deploy] 전역 슬래시 커맨드 배포 완료!');
  } catch (error) {
    console.error("[Deploy] 슬래시 커맨드 배포 오류:", error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  deployCommands();
}

export { deployCommands };
