import { PrismaClient } from "@prisma/client";

// Prisma 클라이언트 인스턴스 생성
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// 데이터베이스 연결 함수
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("[Database] 데이터베이스 연결이 성공적으로 완료되었습니다.");
  } catch (error) {
    console.error("[Database] 데이터베이스 연결 오류:", error);
    throw error;
  }
}

// 데이터베이스 연결 해제 함수
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log("[Database] 데이터베이스 연결이 해제되었습니다.");
  } catch (error) {
    console.error("[Database] 데이터베이스 연결 해제 오류:", error);
    throw error;
  }
}

// 프로세스 종료 시 데이터베이스 연결 해제
process.on("beforeExit", async () => {
  await disconnectDatabase();
});
