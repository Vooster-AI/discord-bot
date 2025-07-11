// Vitest 테스트 환경 설정
import { vi } from "vitest";

// Discord.js 모킹
vi.mock("discord.js", () => ({
  Client: vi.fn(),
  GatewayIntentBits: {},
  Events: {},
  EmbedBuilder: vi.fn(),
  SlashCommandBuilder: vi.fn(),
  Collection: vi.fn(),
  REST: vi.fn(),
  Routes: vi.fn(),
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
    Custom: 4,
    Competing: 5,
  },
  ChannelType: {
    GuildText: 0,
    DM: 1,
    GuildVoice: 2,
    GroupDM: 3,
    GuildCategory: 4,
    GuildAnnouncement: 5,
    AnnouncementThread: 10,
    PublicThread: 11,
    PrivateThread: 12,
    GuildStageVoice: 13,
    GuildDirectory: 14,
    GuildForum: 15,
  },
}));

// 환경 변수 설정
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-token";
process.env.DISCORD_CLIENT_ID = "test-client-id";
process.env.DISCORD_GUILD_ID = "test-guild-id";
process.env.DATABASE_URL = "test-database-url";
