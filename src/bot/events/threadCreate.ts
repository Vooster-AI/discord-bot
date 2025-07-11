import { ThreadChannel } from "discord.js";
import { UserService } from "../../services/userService";
import { RewardService } from "../../services/rewardService";
import { prisma } from "../../utils/prisma";

export default async function threadCreateHandler(
  thread: ThreadChannel,
  newlyCreated: boolean
): Promise<void> {
  // 새로 생성된 스레드가 아니면 무시
  if (!newlyCreated) return;

  // 스레드 소유자가 없으면 무시
  const ownerId = thread.ownerId;
  if (!ownerId) return;

  try {
    console.log(`[ThreadCreate] 스레드 생성: ${thread.name} by ${ownerId}`);

    // 스레드 소유자 정보 가져오기
    const owner = await thread.client.users.fetch(ownerId);

    // 사용자 생성/업데이트
    const user = await UserService.findOrCreateUser(owner.id, {
      username: owner.username,
      globalName: owner.globalName,
      discriminator: owner.discriminator,
      avatarUrl: owner.displayAvatarURL(),
    });

    // 이벤트 저장
    const event = await prisma.discordEvent.create({
      data: {
        discordUserId: user.id,
        eventType: "forum_post",
        channelId: thread.parentId || thread.id,
        messageId: thread.id,
        content: thread.name,
        processed: false,
      },
    });

    // 보상 처리
    await RewardService.processReward(
      user.id,
      thread.parentId || thread.id,
      "forum_post",
      event.id
    );

    console.log(`[ThreadCreate] 처리 완료: ${owner.tag} - 포럼 게시물`);
  } catch (error) {
    console.error("[ThreadCreate] 스레드 처리 오류:", error);
  }
}
