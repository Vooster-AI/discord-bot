import { Client, ActivityType } from "discord.js";

export default function readyEventHandler(client: Client): void {
  console.log(
    `[Bot] 봇이 준비되었습니다! ${client.user?.tag}로 로그인했습니다.`
  );

  // 봇 상태 설정
  client.user?.setActivity("Discord 서버 모니터링", {
    type: ActivityType.Watching,
  });

  // 봇 정보 출력
  console.log(`[Bot] 서버 수: ${client.guilds.cache.size}`);
  console.log(`[Bot] 사용자 수: ${client.users.cache.size}`);

  // 길드 정보 출력
  client.guilds.cache.forEach((guild) => {
    console.log(
      `[Bot] 길드: ${guild.name} (${guild.id}) - 멤버: ${guild.memberCount}명`
    );
  });
}
