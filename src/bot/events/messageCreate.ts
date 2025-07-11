import { Message } from "discord.js";
import { UserService } from "../../services/userService.js";
import { RewardService } from "../../services/rewardService.js";
import { prisma } from "../../utils/prisma.js";

export default async function messageCreateHandler(
  message: Message
): Promise<void> {
  // 봇이나 시스템 메시지는 무시
  if (message.author.bot || message.system) return;

  try {
    console.log(
      `[MessageCreate] 메시지 수신: ${message.author.tag} in #${message.channel.type === 0 ? (message.channel as any).name : "DM"}`
    );

    // 사용자 생성/업데이트
    const user = await UserService.findOrCreateUser(message.author.id, {
      username: message.author.username,
      globalName: message.author.globalName,
      discriminator: message.author.discriminator,
      avatarUrl: message.author.displayAvatarURL(),
    });

    // 이벤트 타입 결정 (스레드 내 메시지인지 확인)
    const eventType = message.channel.isThread() ? "comment" : "message";

    // 이벤트 저장
    const event = await prisma.discordEvent.create({
      data: {
        discordUserId: user.id,
        eventType,
        channelId: message.channel.id,
        messageId: message.id,
        content: message.content,
        processed: false,
      },
    });

    // 보상 처리
    await RewardService.processReward(
      user.id,
      message.channel.id,
      eventType,
      event.id
    );

    console.log(
      `[MessageCreate] 처리 완료: ${message.author.tag} - ${eventType}`
    );
  } catch (error) {
    console.error("[MessageCreate] 메시지 처리 오류:", error);
  }
}
