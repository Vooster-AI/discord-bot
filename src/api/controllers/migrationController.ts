import { Request, Response } from "express";
import { DiscordService } from "../../services/discordService.js";

/**
 * 채널 히스토리 마이그레이션 컨트롤러
 */
export const migrateChannelHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { channelId, limit = 1000 } = req.body;

  if (!channelId) {
    res.status(400).json({
      error: "channelId는 필수 파라미터입니다.",
      example: { channelId: "123456789", limit: 1000 },
    });
    return;
  }

  if (typeof channelId !== "string") {
    res.status(400).json({
      error: "channelId는 문자열이어야 합니다.",
    });
    return;
  }

  if (limit && (typeof limit !== "number" || limit <= 0)) {
    res.status(400).json({
      error: "limit는 양의 정수여야 합니다.",
    });
    return;
  }

  try {
    console.log(
      `[MigrationController] 마이그레이션 요청: 채널 ${channelId}, 제한 ${limit}`
    );

    // 채널 정보 확인
    const channelInfo = await DiscordService.getChannelInfo(channelId);
    if (!channelInfo) {
      res.status(404).json({
        error: "채널을 찾을 수 없습니다. 채널 ID를 확인해주세요.",
      });
      return;
    }

    // 비동기적으로 마이그레이션 시작
    if (channelInfo.isForum) {
      // 포럼 채널인 경우 포럼 게시물 마이그레이션
      DiscordService.fetchForumPosts(channelId, limit)
        .then(() => {
          console.log(
            `[MigrationController] 포럼 마이그레이션 완료: ${channelId}`
          );
        })
        .catch((error) => {
          console.error(
            `[MigrationController] 포럼 마이그레이션 오류: ${channelId}`,
            error
          );
        });
    } else if (channelInfo.isTextBased) {
      // 텍스트 채널인 경우 메시지 마이그레이션
      DiscordService.fetchPastMessages(channelId, limit)
        .then(() => {
          console.log(
            `[MigrationController] 메시지 마이그레이션 완료: ${channelId}`
          );
        })
        .catch((error) => {
          console.error(
            `[MigrationController] 메시지 마이그레이션 오류: ${channelId}`,
            error
          );
        });
    } else {
      res.status(400).json({
        error:
          "지원되지 않는 채널 타입입니다. 텍스트 채널 또는 포럼 채널만 지원됩니다.",
        channelType: channelInfo.type,
      });
      return;
    }

    res.status(202).json({
      message: "마이그레이션 프로세스가 시작되었습니다.",
      channelInfo: {
        id: channelInfo.id,
        name: channelInfo.name,
        type: channelInfo.type,
        isTextBased: channelInfo.isTextBased,
        isForum: channelInfo.isForum,
      },
      limit,
      status: "processing",
    });
  } catch (error) {
    console.error("[MigrationController] 마이그레이션 오류:", error);
    res.status(500).json({
      error: "마이그레이션 시작 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }
};

/**
 * 마이그레이션 상태 확인 컨트롤러
 */
export const getMigrationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const botStatus = DiscordService.getBotStatus();

    res.status(200).json({
      message: "마이그레이션 서비스 상태",
      botStatus: {
        isReady: botStatus.isReady,
        guildCount: botStatus.guildCount,
        userCount: botStatus.userCount,
        uptime: Math.floor(botStatus.uptime / 1000), // 초 단위로 변환
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[MigrationController] 상태 확인 오류:", error);
    res.status(500).json({
      error: "상태 확인 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }
};

/**
 * 채널 정보 조회 컨트롤러
 */
export const getChannelInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { channelId } = req.params;

  if (!channelId) {
    res.status(400).json({
      error: "channelId는 필수 파라미터입니다.",
    });
    return;
  }

  try {
    const channelInfo = await DiscordService.getChannelInfo(channelId);

    if (!channelInfo) {
      res.status(404).json({
        error: "채널을 찾을 수 없습니다.",
      });
      return;
    }

    res.status(200).json({
      message: "채널 정보 조회 성공",
      channelInfo,
    });
  } catch (error) {
    console.error("[MigrationController] 채널 정보 조회 오류:", error);
    res.status(500).json({
      error: "채널 정보 조회 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }
};
