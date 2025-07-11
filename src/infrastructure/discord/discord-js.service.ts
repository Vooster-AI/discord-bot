import { Client, GuildMember, User } from "discord.js";
import { IDiscordService } from "../../domain";
import { DISCORD_GUILD_ID } from "../../config";

/**
 * Discord.js를 사용한 Discord 서비스 구현체
 */
export class DiscordJsService implements IDiscordService {
  constructor(private readonly client: Client) {}

  /**
   * 사용자에게 역할 부여
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      const guild = await this.client.guilds.fetch(DISCORD_GUILD_ID);
      const member = await guild.members.fetch(userId);

      if (!member) {
        throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
      }

      // 이미 역할을 가지고 있는지 확인
      if (member.roles.cache.has(roleId)) {
        console.log(
          `사용자가 이미 역할을 가지고 있습니다: ${member.user.username}`
        );
        return;
      }

      await member.roles.add(roleId);
      console.log(`역할 부여 완료: ${member.user.username} → ${roleId}`);
    } catch (error) {
      console.error(`역할 부여 오류 (${userId}, ${roleId}):`, error);
      throw error;
    }
  }

  /**
   * 사용자에게 DM 전송
   */
  async sendDirectMessage(userId: string, message: string): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      await user.send(message);
      console.log(`DM 전송 완료: ${user.username}`);
      return true;
    } catch (error) {
      console.warn(`DM 전송 실패: ${userId}`, error);
      return false;
    }
  }

  /**
   * 사용자 정보 조회
   */
  async fetchUser(userId: string): Promise<{
    id: string;
    username: string;
    globalName: string | null;
    discriminator: string | null;
    avatarUrl: string | null;
  } | null> {
    try {
      const user = await this.client.users.fetch(userId);
      return {
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        discriminator: user.discriminator as string | null,
        avatarUrl: user.displayAvatarURL(),
      };
    } catch (error) {
      console.error(`사용자 정보 조회 오류: ${userId}`, error);
      return null;
    }
  }

  /**
   * 길드 멤버 정보 조회
   */
  async fetchGuildMember(userId: string): Promise<{
    id: string;
    username: string;
    globalName: string | null;
    roles: string[];
  } | null> {
    try {
      const guild = await this.client.guilds.fetch(DISCORD_GUILD_ID);
      const member = await guild.members.fetch(userId);

      if (!member) {
        return null;
      }

      return {
        id: member.user.id,
        username: member.user.username,
        globalName: member.user.globalName,
        roles: member.roles.cache.map((role) => role.id),
      };
    } catch (error) {
      console.error(`길드 멤버 정보 조회 오류: ${userId}`, error);
      return null;
    }
  }

  /**
   * 사용자가 특정 역할을 가지고 있는지 확인
   */
  async hasRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(DISCORD_GUILD_ID);
      const member = await guild.members.fetch(userId);

      if (!member) {
        return false;
      }

      return member.roles.cache.has(roleId);
    } catch (error) {
      console.error(`역할 확인 오류: ${userId}`, error);
      return false;
    }
  }

  /**
   * 채널 정보 조회
   */
  async fetchChannel(channelId: string): Promise<{
    id: string;
    name: string;
    type: string;
  } | null> {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel) {
        return null;
      }

      return {
        id: channel.id,
        name: ("name" in channel && channel.name) || "Unknown",
        type: channel.type.toString(),
      };
    } catch (error) {
      console.error(`채널 정보 조회 오류: ${channelId}`, error);
      return null;
    }
  }
}
