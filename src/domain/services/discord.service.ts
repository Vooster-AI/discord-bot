/**
 * Discord 서비스 인터페이스
 * 실제 Discord.js 구현에 의존하지 않는 순수한 포트(Port)
 */
export interface IDiscordService {
  /**
   * 사용자에게 역할 부여
   */
  assignRoleToUser(userId: string, roleId: string): Promise<void>;

  /**
   * 사용자에게 DM 전송
   */
  sendDirectMessage(userId: string, message: string): Promise<boolean>;

  /**
   * 사용자 정보 조회
   */
  fetchUser(userId: string): Promise<{
    id: string;
    username: string;
    globalName: string | null;
    discriminator: string | null;
    avatarUrl: string | null;
  } | null>;

  /**
   * 길드 멤버 정보 조회
   */
  fetchGuildMember(userId: string): Promise<{
    id: string;
    username: string;
    globalName: string | null;
    roles: string[];
  } | null>;

  /**
   * 사용자가 특정 역할을 가지고 있는지 확인
   */
  hasRole(userId: string, roleId: string): Promise<boolean>;

  /**
   * 채널 정보 조회
   */
  fetchChannel(channelId: string): Promise<{
    id: string;
    name: string;
    type: string;
  } | null>;
}
