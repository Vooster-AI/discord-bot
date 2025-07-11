import { client } from "../bot";
import {
  TextChannel,
  ThreadChannel,
  ForumChannel,
  ChannelType,
} from "discord.js";
import { prisma } from "../utils/prisma";
import { UserService } from "./userService";
import { RewardService } from "./rewardService";

export class DiscordService {
  /**
   * 과거 메시지 가져오기 (마이그레이션용)
   */
  static async fetchPastMessages(
    channelId: string,
    totalLimit: number = 1000
  ): Promise<void> {
    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        throw new Error("채널이 텍스트 기반 채널이 아닙니다.");
      }

      let lastMessageId: string | undefined = undefined;
      let fetchedMessagesCount = 0;
      const batchSize = 100; // Discord API 제한

      console.log(`[DiscordService] 메시지 마이그레이션 시작: ${channelId}`);

      while (fetchedMessagesCount < totalLimit) {
        const remainingMessages = totalLimit - fetchedMessagesCount;
        const currentBatchSize = Math.min(batchSize, remainingMessages);

        const options: { limit: number; before?: string } = {
          limit: currentBatchSize,
        };

        if (lastMessageId) {
          options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);

        if (messages.size === 0) {
          console.log("[DiscordService] 더 이상 가져올 메시지가 없습니다.");
          break;
        }

        // 메시지 처리
        for (const message of messages.values()) {
          if (message.author.bot || message.system) continue;

          try {
            // 중복 체크: 이미 저장된 메시지인지 확인
            const existingEvent = await prisma.discordEvent.findFirst({
              where: { messageId: message.id },
            });

            if (existingEvent) {
              console.log(
                `[DiscordService] 이미 처리된 메시지 건너뛰기: ${message.id}`
              );
              continue;
            }

            // 사용자 생성/업데이트
            const user = await UserService.findOrCreateUser(message.author.id, {
              username: message.author.username,
              globalName: message.author.globalName,
              discriminator: message.author.discriminator,
              avatarUrl: message.author.displayAvatarURL(),
            });

            // 이벤트 타입 결정
            const eventType = message.channel.isThread()
              ? "comment"
              : "message";

            // 이벤트 저장
            const event = await prisma.discordEvent.create({
              data: {
                discordUserId: user.id,
                eventType,
                channelId: message.channel.id,
                messageId: message.id,
                content: message.content,
                createdAt: message.createdAt,
                processed: false,
              },
            });

            // 보상 처리
            await RewardService.processRewardWithDate(
              user.id,
              message.channel.id,
              eventType,
              message.createdAt,
              event.id
            );

            fetchedMessagesCount++;
          } catch (error) {
            console.error(
              `[DiscordService] 메시지 처리 오류: ${message.id}`,
              error
            );
          }
        }

        lastMessageId = messages.lastKey();

        // API 제한 방지를 위한 지연
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          `[DiscordService] 진행상황: ${fetchedMessagesCount}/${totalLimit} 메시지 처리됨`
        );
      }

      console.log(
        `[DiscordService] 마이그레이션 완료: 총 ${fetchedMessagesCount}개 메시지 처리`
      );
    } catch (error) {
      console.error("[DiscordService] 메시지 마이그레이션 오류:", error);
      throw error;
    }
  }

  /**
   * 포럼 채널의 게시물 가져오기
   */
  static async fetchForumPosts(
    channelId: string,
    totalLimit: number = 100
  ): Promise<void> {
    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel || channel.type !== ChannelType.GuildForum) {
        throw new Error("포럼 채널이 아닙니다.");
      }

      const forumChannel = channel as ForumChannel;

      // 활성 스레드 가져오기
      const activeThreads = await forumChannel.threads.fetchActive();

      // 보관된 스레드 가져오기
      const archivedThreads = await forumChannel.threads.fetchArchived();

      const allThreads = new Map([
        ...activeThreads.threads,
        ...archivedThreads.threads,
      ]);

      let processedCount = 0;

      for (const [threadId, thread] of allThreads) {
        if (processedCount >= totalLimit) break;

        try {
          // 스레드 작성자 처리
          if (thread.ownerId) {
            // 중복 체크: 이미 저장된 포럼 게시물인지 확인
            const existingEvent = await prisma.discordEvent.findFirst({
              where: { messageId: thread.id },
            });

            if (existingEvent) {
              console.log(
                `[DiscordService] 이미 처리된 포럼 게시물 건너뛰기: ${thread.id}`
              );
              continue;
            }

            const owner = await client.users.fetch(thread.ownerId);

            const user = await UserService.findOrCreateUser(owner.id, {
              username: owner.username,
              globalName: owner.globalName,
              discriminator: owner.discriminator,
              avatarUrl: owner.displayAvatarURL(),
            });

            // 포럼 게시물 이벤트 저장
            const event = await prisma.discordEvent.create({
              data: {
                discordUserId: user.id,
                eventType: "forum_post",
                channelId: forumChannel.id,
                messageId: thread.id,
                content: thread.name,
                createdAt: thread.createdAt || new Date(),
                processed: false,
              },
            });

            // 보상 처리
            await RewardService.processRewardWithDate(
              user.id,
              forumChannel.id,
              "forum_post",
              thread.createdAt || new Date(),
              event.id
            );
          }

          // 스레드 내 메시지도 처리
          await this.fetchPastMessages(thread.id, 50);

          processedCount++;
        } catch (error) {
          console.error(
            `[DiscordService] 포럼 게시물 처리 오류: ${threadId}`,
            error
          );
        }
      }

      console.log(
        `[DiscordService] 포럼 마이그레이션 완료: 총 ${processedCount}개 게시물 처리`
      );
    } catch (error) {
      console.error("[DiscordService] 포럼 마이그레이션 오류:", error);
      throw error;
    }
  }

  /**
   * 채널 정보 조회
   */
  static async getChannelInfo(channelId: string): Promise<{
    id: string;
    name: string;
    type: ChannelType;
    isTextBased: boolean;
    isForum: boolean;
  } | null> {
    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel) return null;

      return {
        id: channel.id,
        name: "name" in channel ? channel.name || "Unknown" : "Unknown",
        type: channel.type,
        isTextBased: channel.isTextBased(),
        isForum: channel.type === ChannelType.GuildForum,
      };
    } catch (error) {
      console.error("[DiscordService] 채널 정보 조회 오류:", error);
      return null;
    }
  }

  /**
   * 길드 정보 조회
   */
  static async getGuildInfo(guildId: string): Promise<{
    id: string;
    name: string;
    memberCount: number;
    channels: { id: string; name: string; type: ChannelType }[];
  } | null> {
    try {
      const guild = await client.guilds.fetch(guildId);

      if (!guild) return null;

      const channels = await guild.channels.fetch();
      const channelList = channels.map((channel) => ({
        id: channel?.id || "",
        name: channel?.name || "Unknown",
        type: channel?.type || ChannelType.GuildText,
      }));

      return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        channels: channelList,
      };
    } catch (error) {
      console.error("[DiscordService] 길드 정보 조회 오류:", error);
      return null;
    }
  }

  /**
   * 사용자 정보 조회
   */
  static async getUserInfo(userId: string): Promise<{
    id: string;
    username: string;
    globalName: string | null;
    discriminator: string | null;
    avatarUrl: string;
  } | null> {
    try {
      const user = await client.users.fetch(userId);

      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        discriminator: user.discriminator,
        avatarUrl: user.displayAvatarURL(),
      };
    } catch (error) {
      console.error("[DiscordService] 사용자 정보 조회 오류:", error);
      return null;
    }
  }

  /**
   * 봇 상태 확인
   */
  static getBotStatus(): {
    isReady: boolean;
    guildCount: number;
    userCount: number;
    uptime: number;
  } {
    return {
      isReady: client.isReady(),
      guildCount: client.guilds.cache.size,
      userCount: client.users.cache.size,
      uptime: client.uptime || 0,
    };
  }
}
