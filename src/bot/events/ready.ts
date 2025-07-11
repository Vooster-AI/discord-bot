import { Client, ActivityType, ChannelType } from "discord.js";

export default function readyEventHandler(client: Client): void {
  console.log("=".repeat(60));
  console.log(
    `[Bot] 봇이 준비되었습니다! ${client.user?.tag}로 로그인했습니다.`
  );
  console.log(`[Bot] 봇 ID: ${client.user?.id}`);
  console.log(`[Bot] 현재 시간: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  // 봇 상태 설정
  client.user?.setActivity("Discord 서버 모니터링", {
    type: ActivityType.Watching,
  });

  // 전체 통계 출력
  console.log(`[Bot] 📊 전체 통계:`);
  console.log(`  - 연결된 서버 수: ${client.guilds.cache.size}`);
  console.log(`  - 캐시된 사용자 수: ${client.users.cache.size}`);
  console.log(`  - 캐시된 채널 수: ${client.channels.cache.size}`);
  console.log("");

  // 각 길드 정보 출력
  if (client.guilds.cache.size > 0) {
    console.log(`[Bot] 🏰 연결된 서버 목록:`);
    client.guilds.cache.forEach((guild, index) => {
      console.log(`  ${index + 1}. ${guild.name}`);
      console.log(`     - 서버 ID: ${guild.id}`);
      console.log(`     - 멤버 수: ${guild.memberCount}명`);
      console.log(`     - 채널 수: ${guild.channels.cache.size}개`);
      console.log(`     - 역할 수: ${guild.roles.cache.size}개`);
      console.log(
        `     - 서버 생성일: ${guild.createdAt.toLocaleDateString("ko-KR")}`
      );
      console.log(`     - 서버 소유자: ${guild.ownerId}`);
      console.log(
        `     - 봇 권한: ${guild.members.me?.permissions.toArray().join(", ") || "권한 정보 없음"}`
      );

      // 텍스트 채널 정보
      const textChannels = guild.channels.cache.filter(
        (channel) => channel.type === ChannelType.GuildText
      );
      if (textChannels.size > 0) {
        console.log(`     - 텍스트 채널 목록 (${textChannels.size}개):`);
        textChannels.forEach((channel) => {
          console.log(`       • ${channel.name} (${channel.id})`);
        });
      }

      // 포럼 채널 정보
      const forumChannels = guild.channels.cache.filter(
        (channel) => channel.type === ChannelType.GuildForum
      );
      if (forumChannels.size > 0) {
        console.log(`     - 포럼 채널 목록 (${forumChannels.size}개):`);
        forumChannels.forEach((channel) => {
          console.log(`       • ${channel.name} (${channel.id})`);
        });
      }

      // 음성 채널 정보
      const voiceChannels = guild.channels.cache.filter(
        (channel) => channel.type === ChannelType.GuildVoice
      );
      if (voiceChannels.size > 0) {
        console.log(`     - 음성 채널 목록 (${voiceChannels.size}개):`);
        voiceChannels.forEach((channel) => {
          console.log(`       • ${channel.name} (${channel.id})`);
        });
      }

      // 카테고리 채널 정보
      const categoryChannels = guild.channels.cache.filter(
        (channel) => channel.type === ChannelType.GuildCategory
      );
      if (categoryChannels.size > 0) {
        console.log(`     - 카테고리 목록 (${categoryChannels.size}개):`);
        categoryChannels.forEach((channel) => {
          console.log(`       • ${channel.name} (${channel.id})`);
        });
      }

      // 역할 정보
      const roles = guild.roles.cache.filter((role) => role.id !== guild.id); // @everyone 역할 제외
      if (roles.size > 0) {
        console.log(`     - 역할 목록 (${roles.size}개, @everyone 제외):`);
        roles.forEach((role) => {
          console.log(
            `       • ${role.name} (${role.id}) - 색상: ${role.hexColor} - 멤버: ${role.members.size}명`
          );
        });
      }

      console.log("");
    });
  } else {
    console.log(`[Bot] ⚠️ 연결된 서버가 없습니다.`);
  }

  console.log("=".repeat(60));
  console.log(`[Bot] ✅ 봇이 모든 서버에 성공적으로 연결되었습니다!`);
  console.log("=".repeat(60));
}
