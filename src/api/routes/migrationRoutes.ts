import { Router } from "express";
import {
  migrateChannelHistory,
  getMigrationStatus,
  getChannelInfo,
} from "../controllers/migrationController.js";
import {
  authMiddleware,
  adminMiddleware,
  logMiddleware,
} from "../middleware/authMiddleware.js";

const router: Router = Router();

// 모든 라우트에 로깅 미들웨어 적용
router.use(logMiddleware);

/**
 * POST /api/discord/migrate
 * 채널 히스토리 마이그레이션
 */
router.post("/migrate", authMiddleware, adminMiddleware, migrateChannelHistory);

/**
 * GET /api/discord/status
 * 마이그레이션 서비스 상태 확인
 */
router.get("/status", authMiddleware, getMigrationStatus);

/**
 * GET /api/discord/channels/:channelId
 * 채널 정보 조회
 */
router.get("/channels/:channelId", authMiddleware, getChannelInfo);

/**
 * GET /api/discord/health
 * 헬스 체크 엔드포인트 (인증 없이 접근 가능)
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "Discord Bot Server API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
