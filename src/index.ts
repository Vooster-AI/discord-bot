import express from "express";
import { startBot } from "./bot";
import { PORT } from "./config";
import migrationRoutes from "./api/routes/migrationRoutes";
import { errorMiddleware } from "./api/middleware/authMiddleware";

/**
 * Discord Bot Server 메인 엔트리 포인트
 * Discord Bot과 Express API 서버를 동시에 실행
 */
async function main(): Promise<void> {
  try {
    console.log("[Main] Discord Bot Server 시작 중...");

    // Discord Bot 시작
    await startBot();

    // Express API 서버 시작
    const app = express();

    // JSON 파싱 미들웨어
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // CORS 허용 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS"
        );
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Key"
        );

        if (req.method === "OPTIONS") {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // API 라우트 등록
    app.use("/api/discord", migrationRoutes);

    // 기본 라우트
    app.get("/", (req, res) => {
      res.json({
        message: "Discord Bot Server API",
        version: "1.0.0",
        endpoints: {
          health: "/api/discord/health",
          status: "/api/discord/status",
          migrate: "/api/discord/migrate",
          channelInfo: "/api/discord/channels/:channelId",
        },
        documentation: "https://github.com/your-repo/discord-bot-server",
      });
    });

    // 404 핸들러
    app.use("*", (req, res) => {
      res.status(404).json({
        error: "엔드포인트를 찾을 수 없습니다.",
        requestedUrl: req.originalUrl,
        method: req.method,
      });
    });

    // 에러 핸들러 (마지막에 등록)
    app.use(errorMiddleware);

    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log(`[API] Express 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`[API] API 문서: http://localhost:${PORT}/`);
      console.log(
        `[API] 헬스 체크: http://localhost:${PORT}/api/discord/health`
      );
    });

    // 서버 종료 처리
    process.on("SIGTERM", () => {
      console.log("[Main] SIGTERM 신호 받음. 서버 종료 중...");
      server.close(() => {
        console.log("[Main] Express 서버가 종료되었습니다.");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("[Main] SIGINT 신호 받음. 서버 종료 중...");
      server.close(() => {
        console.log("[Main] Express 서버가 종료되었습니다.");
        process.exit(0);
      });
    });

    console.log("[Main] Discord Bot Server가 성공적으로 시작되었습니다! 🚀");
  } catch (error) {
    console.error("[Main] 서버 시작 오류:", error);
    process.exit(1);
  }
}

// 처리되지 않은 Promise 거부 처리
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Main] 처리되지 않은 Promise 거부:", reason);
  console.error("[Main] Promise:", promise);
  process.exit(1);
});

// 처리되지 않은 예외 처리
process.on("uncaughtException", (error) => {
  console.error("[Main] 처리되지 않은 예외:", error);
  process.exit(1);
});

// 메인 함수 실행
main();
