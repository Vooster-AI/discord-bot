import {
  Interaction,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { UserService } from "../../services/userService";
import { LevelService } from "../../services/levelService";
import {
  formatTimeAgo,
  getRewardTypeEmoji,
  truncateContent,
} from "../../utils/timeUtils";

// 상수 정의
const COMMAND_COLORS = {
  LEVEL: "#0099ff",
  TOP: "#0099ff",
  HISTORY: "#0099ff",
  VOOSTER: "#0099ff",
} as const;

const HISTORY_LIMIT = 5;
const TOP_LIMIT = 10;

export default async function interactionCreateHandler(
  interaction: Interaction
): Promise<void> {
  // 슬래시 커맨드가 아니면 무시
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    console.log(
      `[InteractionCreate] 명령어 사용: ${commandName} by ${interaction.user.tag}`
    );

    switch (commandName) {
      case "level":
        await handleLevelCommand(interaction);
        break;
      case "top":
        await handleTopCommand(interaction);
        break;
      case "history":
        await handleHistoryCommand(interaction);
        break;
      case "vooster":
        await handleVoosterCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: "알 수 없는 명령어입니다.",
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error(
      `[InteractionCreate] 명령어 처리 오류 (${commandName}):`,
      error
    );

    if (!interaction.replied) {
      await interaction.reply({
        content: "명령어 처리 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * /level 명령어 처리
 */
async function handleLevelCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  try {
    const userData = await UserService.getUserData(targetUser.id);

    if (!userData) {
      await interaction.reply({
        content: "사용자 정보를 찾을 수 없습니다.",
        ephemeral: true,
      });
      return;
    }

    // 현재 레벨과 다음 레벨 정보 가져오기
    const currentLevel = await LevelService.getCurrentLevel(
      userData.currentReward
    );
    const nextLevel = await LevelService.getNextLevel(userData.currentLevel);
    const progress = await LevelService.calculateProgress(
      userData.currentReward,
      userData.currentLevel
    );

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.globalName || targetUser.username}의 레벨 정보`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: "현재 레벨",
          value: `${userData.currentLevel} (${currentLevel?.levelName || "Unknown"})`,
          inline: true,
        },
        {
          name: "현재 포인트",
          value: `${userData.currentReward}`,
          inline: true,
        },
        {
          name: "다음 레벨까지",
          value: nextLevel
            ? `${nextLevel.requiredRewardAmount - userData.currentReward}`
            : "최고 레벨",
          inline: true,
        },
        {
          name: "진행률",
          value: `${progress.progressPercentage.toFixed(1)}%`,
          inline: true,
        }
      )
      .setColor(COMMAND_COLORS.LEVEL)
      .setFooter({
        text: "Discord Bot Server",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("[LevelCommand] 레벨 명령어 처리 오류:", error);
    await interaction.reply({
      content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
      ephemeral: true,
    });
  }
}

/**
 * /top 명령어 처리
 */
async function handleTopCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    const leaderboard = await UserService.getLeaderboard(TOP_LIMIT);

    if (leaderboard.length === 0) {
      await interaction.reply({
        content: "리더보드 데이터가 없습니다.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 리더보드 (Top ${TOP_LIMIT})`)
      .setColor(COMMAND_COLORS.TOP)
      .setFooter({
        text: "Discord Bot Server",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    leaderboard.forEach((user, index) => {
      const medal = getMedalEmoji(index);
      embed.addFields({
        name: `${medal} ${index + 1}위`,
        value: `${user.globalName || user.username}\n레벨: ${user.currentLevel} | 포인트: ${user.currentReward}`,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("[TopCommand] 리더보드 명령어 처리 오류:", error);
    await interaction.reply({
      content: "리더보드를 가져오는 중 오류가 발생했습니다.",
      ephemeral: true,
    });
  }
}

/**
 * /history 명령어 처리
 */
async function handleHistoryCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  try {
    const rewardHistory = await UserService.getUserRewardHistory(
      targetUser.id,
      HISTORY_LIMIT
    );

    if (rewardHistory.length === 0) {
      await interaction.reply({
        content: "리워드 내역이 없습니다.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(
        `${targetUser.globalName || targetUser.username}의 최근 리워드 내역`
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(COMMAND_COLORS.HISTORY)
      .setFooter({
        text: "Discord Bot Server",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    rewardHistory.forEach((reward) => {
      const typeEmoji = getRewardTypeEmoji(reward.type);
      const content = truncateContent(reward.event?.content);
      const channelId = reward.event?.channelId || "알 수 없음";
      const timeAgo = formatTimeAgo(reward.createdAt);

      embed.addFields({
        name: `${typeEmoji} ${reward.type} (+${reward.amount} 포인트)`,
        value: `**채널:** <#${channelId}>\n**내용:** ${content}\n**시점:** ${timeAgo}`,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("[HistoryCommand] 리워드 내역 명령어 처리 오류:", error);
    await interaction.reply({
      content: "리워드 내역을 가져오는 중 오류가 발생했습니다.",
      ephemeral: true,
    });
  }
}

/**
 * /vooster 명령어 처리
 */
async function handleVoosterCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const email = interaction.options.getString("email", true);

  // 이메일 유효성 검사
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await interaction.reply({
      content: "올바른 이메일 형식이 아닙니다.",
      ephemeral: true,
    });
    return;
  }

  try {
    await UserService.updateVoosterEmail(interaction.user.id, email);

    await interaction.reply({
      content: `✅ Vooster 이메일이 성공적으로 등록되었습니다: ${email}`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("[VoosterCommand] Vooster 이메일 명령어 처리 오류:", error);
    await interaction.reply({
      content: "Vooster 이메일 등록 중 오류가 발생했습니다.",
      ephemeral: true,
    });
  }
}

/**
 * 순위에 따른 메달 이모지 반환
 */
function getMedalEmoji(index: number): string {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return "🏅";
  }
}
