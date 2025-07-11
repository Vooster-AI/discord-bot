import { Request, Response, NextFunction } from "express";
import { API_SECRET_KEY } from "../../config.js";

/**
 * API 키 인증 미들웨어
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    res.status(401).json({
      error: "인증이 필요합니다. Authorization 헤더를 포함해주세요.",
      example: "Authorization: Bearer your_api_key",
    });
    return;
  }

  // Bearer 토큰 형식 확인
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    res.status(401).json({
      error: "유효하지 않은 인증 형식입니다. Bearer 토큰을 사용해주세요.",
      example: "Authorization: Bearer your_api_key",
    });
    return;
  }

  // API 키 검증
  if (token !== API_SECRET_KEY) {
    res.status(401).json({
      error: "유효하지 않은 API 키입니다.",
    });
    return;
  }

  // 인증 성공 시 다음 미들웨어로 진행
  next();
};

/**
 * 관리자 권한 확인 미들웨어 (추가 보안)
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const adminHeader = req.headers["x-admin-key"];

  if (!adminHeader) {
    res.status(403).json({
      error: "관리자 권한이 필요합니다. X-Admin-Key 헤더를 포함해주세요.",
    });
    return;
  }

  // 관리자 키 검증 (환경 변수에서 별도 관리 가능)
  const adminKey = process.env.ADMIN_SECRET_KEY || API_SECRET_KEY;

  if (adminHeader !== adminKey) {
    res.status(403).json({
      error: "유효하지 않은 관리자 키입니다.",
    });
    return;
  }

  next();
};

/**
 * 요청 로깅 미들웨어
 */
export const logMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const { method, url, ip } = req;

  console.log(`[API] ${method} ${url} - ${ip} 요청 시작`);

  // 응답 완료 시 로그 출력
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    console.log(`[API] ${method} ${url} - ${statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * 에러 처리 미들웨어
 */
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[API] 에러 발생: ${req.method} ${req.url}`, error);

  // 이미 응답이 전송된 경우 기본 에러 처리로 넘김
  if (res.headersSent) {
    return next(error);
  }

  // 에러 타입별 처리
  if (error.name === "ValidationError") {
    res.status(400).json({
      error: "유효성 검사 실패",
      details: error.message,
    });
  } else if (error.name === "UnauthorizedError") {
    res.status(401).json({
      error: "인증 실패",
      details: error.message,
    });
  } else if (error.name === "ForbiddenError") {
    res.status(403).json({
      error: "접근 거부",
      details: error.message,
    });
  } else if (error.name === "NotFoundError") {
    res.status(404).json({
      error: "리소스를 찾을 수 없음",
      details: error.message,
    });
  } else {
    // 기타 서버 오류
    res.status(500).json({
      error: "서버 내부 오류",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    });
  }
};
