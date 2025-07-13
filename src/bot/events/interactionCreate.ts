import {
  Interaction,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { UserService } from "../../services/userService.js";
import { LevelService } from "../../services/levelService.js";
import {
  formatTimeAgo,
  getRewardTypeEmoji,
  truncateContent,
} from "../../utils/timeUtils.js";

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
      case "levels":
        await handleLevelsCommand(interaction);
        break;
      case "help":
        await handleHelpCommand(interaction);
        break;
      case "daily-bonus":
        await handleDailyBonusCommand(interaction);
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
 * 사용자가 존재하는지 확인하고, 없으면 생성하는 헬퍼 함수
 */
async function ensureUserExists(targetUser: any): Promise<any> {
  let userData = await UserService.getUserData(targetUser.id);

  if (!userData) {
    userData = await UserService.findOrCreateUser(targetUser.id, {
      username: targetUser.username,
      globalName: targetUser.globalName,
      discriminator: targetUser.discriminator || null,
      avatarUrl: targetUser.displayAvatarURL(),
    });
  }

  return userData;
}

/**
 * /level 명령어 처리
 */
async function handleLevelCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  try {
    // 즉시 defer하여 응답 시간 연장 (15분까지 가능)
    await interaction.deferReply();

    const userData = await ensureUserExists(targetUser);

    // 병렬 처리로 성능 최적화
    const [ranking, currentLevel, nextLevel, progress] = await Promise.all([
      UserService.getUserRanking(targetUser.id),
      LevelService.getCurrentLevel(userData.currentReward),
      LevelService.getNextLevel(userData.currentLevel),
      LevelService.calculateProgress(
        userData.currentReward,
        userData.currentLevel
      ),
    ]);

    // 레벨에 따른 이모지 및 색상 결정
    const levelEmoji = getLevelEmoji(userData.currentLevel);
    const levelColor = getLevelColor(userData.currentLevel);
    const progressBar = createProgressBar(progress.progressPercentage);

    // 랭킹 이모지 및 텍스트
    const rankEmoji = getRankEmoji(ranking?.rank || 0);
    const rankText = ranking
      ? `${rankEmoji} **${ranking.rank}위** / ${ranking.totalUsers}명 (상위 ${100 - ranking.percentile}%)`
      : "순위 정보 없음";

    // 다음 레벨까지 필요한 포인트
    const nextLevelPoints = nextLevel
      ? nextLevel.requiredRewardAmount - userData.currentReward
      : 0;

    // 축하 메시지 생성
    const congratsMessage = getCongratulationsMessage(userData.currentLevel);

    const embed = new EmbedBuilder()
      .setTitle(
        `${levelEmoji} ${targetUser.globalName || targetUser.username}의 레벨 정보`
      )
      .setDescription(`${congratsMessage}\n\n${rankText}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "🎯 현재 레벨",
          value: `**${userData.currentLevel}** (${currentLevel?.levelName || "Unknown"})`,
          inline: true,
        },
        {
          name: "💎 총 포인트",
          value: `**${userData.currentReward.toLocaleString()}**`,
          inline: true,
        },
        {
          name: nextLevel ? "🚀 다음 레벨까지" : "🏆 최고 레벨",
          value: nextLevel
            ? `**${nextLevelPoints.toLocaleString()}** 포인트`
            : "**축하합니다!**",
          inline: true,
        },
        {
          name: "📊 진행률",
          value: `${progressBar}\n**${progress.progressPercentage.toFixed(1)}%** 완료`,
          inline: false,
        }
      )
      .setColor(levelColor)
      .setFooter({
        text: `Discord Bot Server • ${new Date().toLocaleDateString("ko-KR")}`,
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    // 특별한 레벨에 대한 추가 정보
    if (userData.currentLevel >= 5) {
      embed.addFields({
        name: "🌟 특별 혜택",
        value: getSpecialBenefits(userData.currentLevel),
        inline: false,
      });
    }

    // 다음 레벨 정보 추가
    if (nextLevel) {
      embed.addFields({
        name: `✨ 다음 레벨: ${nextLevel.levelName}`,
        value: `${nextLevel.requiredRewardAmount.toLocaleString()} 포인트에 도달하면 ${nextLevel.levelName}가 됩니다!`,
        inline: false,
      });
    }

    // defer 후에는 followUp 사용
    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error("[LevelCommand] 레벨 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * /top 명령어 처리
 */
async function handleTopCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // 즉시 defer하여 응답 시간 연장
    await interaction.deferReply();

    const leaderboard = await UserService.getLeaderboard(TOP_LIMIT);

    if (leaderboard.length === 0) {
      await interaction.followUp({
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
        value: `${user.globalName || user.username} [레벨: ${user.currentLevel} | 포인트: ${user.currentReward}]`,
        inline: false,
      });
    });

    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error("[TopCommand] 리더보드 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "리더보드를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "리더보드를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
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
    // 즉시 defer하여 응답 시간 연장
    await interaction.deferReply();

    const rewardHistory = await UserService.getUserRewardHistory(
      targetUser.id,
      HISTORY_LIMIT
    );

    if (rewardHistory.length === 0) {
      // 사용자가 존재하지 않으면 새로 생성
      await ensureUserExists(targetUser);

      await interaction.followUp({
        content:
          "아직 리워드 내역이 없습니다. 메시지를 작성하거나 포럼에 참여해보세요!",
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
      const content = truncateContent(reward.event?.content || reward.reason);
      const channelId = reward.event?.channelId || "알 수 없음";
      const timeAgo = formatTimeAgo(reward.createdAt);

      embed.addFields({
        name: `${typeEmoji} ${reward.type} (+${reward.amount} 포인트)`,
        value: `**채널:** <#${channelId}>\n**내용:** ${content}\n**시점:** ${timeAgo}`,
        inline: false,
      });
    });

    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error("[HistoryCommand] 리워드 내역 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "리워드 내역을 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "리워드 내역을 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
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
    // 데이터베이스 업데이트 작업이 있으므로 defer 사용
    await interaction.deferReply({ ephemeral: true });

    await UserService.updateVoosterEmail(interaction.user.id, email);

    await interaction.followUp({
      content: `✅ Vooster 이메일이 성공적으로 등록되었습니다: ${email}`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("[VoosterCommand] Vooster 이메일 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "Vooster 이메일 등록 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Vooster 이메일 등록 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * /levels 명령어 처리
 */
async function handleLevelsCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    // 즉시 defer하여 응답 시간 연장
    await interaction.deferReply();

    const levels = await LevelService.getAllLevels();

    if (levels.length === 0) {
      await interaction.followUp({
        content: "레벨 정보를 찾을 수 없습니다.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎯 레벨 시스템 안내")
      .setDescription("포인트를 모아서 레벨을 올리고 특별한 역할을 획득하세요!")
      .setColor(COMMAND_COLORS.LEVEL)
      .setFooter({
        text: "Discord Bot Server",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    levels.forEach((level) => {
      const hasRole = level.discordRoleTableId !== null;
      const roleIndicator = hasRole ? " 🎖️" : "";

      embed.addFields({
        name: `레벨 ${level.levelNumber}: ${level.levelName}`,
        value: `필요 포인트: ${level.requiredRewardAmount}${roleIndicator}`,
        inline: true,
      });
    });

    await interaction.followUp({ embeds: [embed] });
  } catch (error) {
    console.error("[LevelsCommand] 레벨 시스템 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "레벨 정보를 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * /help 명령어 처리
 */
async function handleHelpCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    const embed = new EmbedBuilder()
      .setTitle("🤖 봇 명령어 도움말")
      .setDescription("사용 가능한 모든 명령어와 설명입니다.")
      .setColor(COMMAND_COLORS.LEVEL)
      .addFields(
        {
          name: "/level [user]",
          value: "사용자의 레벨 정보를 확인합니다.",
          inline: false,
        },
        {
          name: "/levels",
          value: "레벨업 기준과 보상 정보를 확인합니다.",
          inline: false,
        },
        {
          name: "/top",
          value: "서버 리더보드를 확인합니다.",
          inline: false,
        },
        {
          name: "/history [user]",
          value: "사용자의 최근 리워드 내역을 확인합니다.",
          inline: false,
        },
        {
          name: "/vooster <email>",
          value: "Vooster 이메일을 등록합니다.",
          inline: false,
        },
        {
          name: "/daily-bonus",
          value: "매일 한 번 받을 수 있는 랜덤 보너스를 받습니다.",
          inline: false,
        },
        {
          name: "/help",
          value: "이 도움말을 표시합니다.",
          inline: false,
        }
      )
      .setFooter({
        text: "Discord Bot Server",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    // help 명령어는 즉시 응답 가능하므로 defer 없이 reply 사용
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("[HelpCommand] 도움말 명령어 처리 오류:", error);

    // 에러 응답 처리
    if (interaction.deferred) {
      await interaction.followUp({
        content: "도움말을 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "도움말을 가져오는 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * /daily-bonus 명령어 처리
 */
async function handleDailyBonusCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    await interaction.deferReply();

    const user = await ensureUserExists(interaction.user);

    // 쿨다운 확인 (KST 기준 00:00 리셋)
    const now = new Date();
    const lastBonus = user.lastDailyBonus;

    if (lastBonus) {
      // KST로 변환 (UTC+9)
      const nowKST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const lastBonusKST = new Date(
        new Date(lastBonus).getTime() + 9 * 60 * 60 * 1000
      );

      // 날짜 부분만 비교 (시간 제거)
      const todayKST = new Date(
        nowKST.getFullYear(),
        nowKST.getMonth(),
        nowKST.getDate()
      );
      const lastBonusDateKST = new Date(
        lastBonusKST.getFullYear(),
        lastBonusKST.getMonth(),
        lastBonusKST.getDate()
      );

      if (todayKST.getTime() === lastBonusDateKST.getTime()) {
        // 다음 00:00 KST까지 남은 시간 계산
        const tomorrowKST = new Date(todayKST.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowUTC = new Date(
          tomorrowKST.getTime() - 9 * 60 * 60 * 1000
        );
        const timeRemaining = tomorrowUTC.getTime() - now.getTime();
        const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));

        await interaction.followUp({
          content: `⏰ 일일 보너스는 KST 기준 자정(00:00)에 리셋됩니다!\n다음 보너스까지 **${hoursRemaining}시간** 남았습니다.`,
          ephemeral: true,
        });
        return;
      }
    }

    // 랜덤 보상 계산
    const rewardAmount = calculateRandomReward();

    // 보상 지급
    const newTotalReward = user.currentReward + rewardAmount;
    await UserService.updateUserPoints(user.id, newTotalReward);
    await UserService.updateDailyBonusTime(user.id, now);

    // 보상 히스토리 기록
    await UserService.createRewardHistory({
      discordUserId: user.id,
      amount: rewardAmount,
      type: "daily_bonus",
      reason: `일일 보너스 (${rewardAmount} 포인트)`,
    });

    // 레벨 업 확인
    const oldLevel = user.currentLevel;
    const newLevel =
      await LevelService.calculateLevelFromReward(newTotalReward);
    let levelUpMessage = "";

    if (newLevel > oldLevel) {
      await UserService.updateUserLevel(user.id, newLevel);
      const levelInfo = await LevelService.getCurrentLevel(newTotalReward);
      levelUpMessage = `\n\n🎉 **레벨업!** 레벨 ${newLevel} (${levelInfo?.levelName || "Unknown"})에 도달했습니다!`;
    }

    // 보상 이모지 결정
    const rewardEmoji = getRewardEmoji(rewardAmount);
    const rarity = getRewardRarity(rewardAmount);

    const embed = new EmbedBuilder()
      .setTitle(`🎁 일일 보너스!`)
      .setDescription(
        `${rewardEmoji} **${rewardAmount} 포인트**를 받았습니다! ${rarity}`
      )
      .addFields(
        {
          name: "💎 총 포인트",
          value: `**${newTotalReward.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "🎯 현재 레벨",
          value: `**${newLevel > oldLevel ? newLevel : user.currentLevel}**`,
          inline: true,
        }
      )
      .setColor(getRewardColor(rewardAmount))
      .setFooter({
        text: "매일 자정(KST 00:00)에 리셋됩니다!",
        iconURL: interaction.client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.followUp({
      content: `${interaction.user}${levelUpMessage}`,
      embeds: [embed],
    });
  } catch (error) {
    console.error("[DailyBonusCommand] 일일 보너스 명령어 처리 오류:", error);

    if (interaction.deferred) {
      await interaction.followUp({
        content: "일일 보너스 처리 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "일일 보너스 처리 중 오류가 발생했습니다.",
        ephemeral: true,
      });
    }
  }
}

/**
 * 가중치 기반 랜덤 보상 계산
 * 1 point: 70%
 * 2 point: 20%
 * 3 point: 3%
 * 5 point: 1.9%
 * 10 point: 0.1%
 */
function calculateRandomReward(): number {
  const random = Math.random() * 100; // 0-100 사이의 랜덤 값

  if (random < 70) return 1; // 0-70: 1 포인트 (70%)
  if (random < 95) return 2; // 70-90: 2 포인트 (25%)
  if (random < 99) return 3; // 90-93: 3 포인트 (4%)
  if (random < 99.9) return 5; // 93-94.9: 5 포인트 (2.9%)
  return 10; // 94.9-100: 10 포인트 (0.1%)
}

/**
 * 보상 금액에 따른 이모지 반환
 */
function getRewardEmoji(amount: number): string {
  switch (amount) {
    case 1:
      return "🪙";
    case 2:
      return "💰";
    case 3:
      return "💎";
    case 5:
      return "🏆";
    case 10:
      return "👑";
    default:
      return "🎁";
  }
}

/**
 * 보상 금액에 따른 희귀도 텍스트 반환
 */
function getRewardRarity(amount: number): string {
  switch (amount) {
    case 1:
      return "(일반)";
    case 2:
      return "(고급)";
    case 3:
      return "(희귀)";
    case 5:
      return "(영웅)";
    case 10:
      return "(전설)";
    default:
      return "";
  }
}

/**
 * 보상 금액에 따른 색상 반환
 */
function getRewardColor(amount: number): number {
  switch (amount) {
    case 1:
      return 0x96ceb4; // 연두색 (일반)
    case 2:
      return 0x45b7d1; // 파란색 (고급)
    case 3:
      return 0x4ecdc4; // 청록색 (희귀)
    case 5:
      return 0xff6b35; // 오렌지 (영웅)
    case 10:
      return 0xffd700; // 골드 (전설)
    default:
      return 0x0099ff;
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

/**
 * 레벨에 따른 이모지 반환
 */
function getLevelEmoji(level: number): string {
  if (level >= 7) return "👑";
  if (level >= 5) return "🏆";
  if (level >= 3) return "🥇";
  if (level >= 2) return "🎖️";
  return "🌱";
}

/**
 * 레벨에 따른 색상 반환
 */
function getLevelColor(level: number): number {
  if (level >= 7) return 0xffd700; // 골드
  if (level >= 5) return 0xff6b35; // 오렌지
  if (level >= 3) return 0x4ecdc4; // 청록색
  if (level >= 2) return 0x45b7d1; // 파란색
  return 0x96ceb4; // 연두색
}

/**
 * 진행률 바 생성
 */
function createProgressBar(percentage: number): string {
  const totalBars = 10;
  const filledBars = Math.round((percentage / 100) * totalBars);
  const emptyBars = totalBars - filledBars;

  const filled = "█".repeat(filledBars);
  const empty = "░".repeat(emptyBars);

  return `${filled}${empty}`;
}

/**
 * 랭킹에 따른 이모지 반환
 */
function getRankEmoji(rank: number): string {
  if (rank === 2) return "🥇";
  if (rank === 3) return "🥈";
  if (rank === 4) return "🥉";
  if (rank <= 11) return "🏅";
  if (rank <= 51) return "⭐";
  return "📊";
}

/**
 * 레벨에 따른 축하 메시지 반환
 */
function getCongratulationsMessage(level: number): string {
  const messages = {
    1: "🌟 새로운 시작! 포인트를 모아서 레벨을 올려보세요!",
    2: "🎉 첫 번째 레벨 업! 계속 활동해보세요!",
    3: "🔥 Beta MVP 달성! 이제 진짜 시작이네요!",
    4: "💪 Active 레벨! 정말 활발하게 활동하고 계시는군요!",
    5: "🚀 Contributor 레벨! 커뮤니티에 기여해주셔서 감사합니다!",
    6: "⚡ Veteran 레벨! 경험이 쌓여가고 있어요!",
    7: "👑 Ambassador 레벨! 최고의 멤버입니다!",
  };

  return messages[level as keyof typeof messages] || "🎯 멋진 레벨이네요!";
}

/**
 * 특별 혜택 정보 반환
 */
function getSpecialBenefits(level: number): string {
  const benefits = [];

  if (level >= 3) benefits.push("🎨 Beta MVP 역할");
  if (level >= 5) benefits.push("💝 Contributor 역할");
  if (level >= 7) benefits.push("👑 Ambassador 역할", "🌟 특별 채널 접근");

  return benefits.length > 0
    ? benefits.join("\n")
    : "계속 활동하면 더 많은 혜택이 기다려요!";
}
