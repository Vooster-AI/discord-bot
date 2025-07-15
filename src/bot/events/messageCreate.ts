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
    const isThread = message.channel.isThread();
    const eventType = isThread ? "comment" : "message";
    
    // 보상 조회를 위한 채널 ID 결정
    // 스레드(댓글)인 경우 부모 채널(포럼)의 ID를 사용하고, 일반 메시지는 해당 채널 ID를 사용
    const rewardChannelId = isThread ? message.channel.parentId : message.channel.id;

    // 부모 ID가 없는 경우를 대비한 방어 코드
    if (!rewardChannelId) {
      console.error(`[MessageCreate] 유효한 보상 채널 ID를 확인할 수 없습니다. 메시지 ID: ${message.id}`);
      return;
    }

    // 이벤트 저장 (기록에는 실제 채널 ID를 유지)
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

    // 보상 처리 - rewardChannelId 사용
    await RewardService.processReward(
      user.id,
      rewardChannelId,
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
