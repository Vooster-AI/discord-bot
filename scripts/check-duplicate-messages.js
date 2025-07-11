import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// 환경 변수 로드
config();

const prisma = new PrismaClient();

async function checkDuplicateMessages() {
  console.log("🔍 중복된 messageId 확인 중...");

  try {
    // 중복된 messageId가 있는지 확인
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "messageId", 
        COUNT(*) as count
      FROM discord_event 
      WHERE "messageId" IS NOT NULL 
      GROUP BY "messageId" 
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;

    console.log(`📊 중복된 messageId 발견: ${duplicates.length}개`);

    if (duplicates.length > 0) {
      console.log("\n🔍 중복 데이터 상세 정보:");
      for (const duplicate of duplicates) {
        console.log(
          `- messageId: ${duplicate.messageId}, 중복 횟수: ${duplicate.count}`
        );
      }

      // 중복된 데이터의 상세 정보 조회
      console.log("\n📋 중복된 데이터 상세 정보:");
      for (const duplicate of duplicates) {
        const events = await prisma.discordEvent.findMany({
          where: { messageId: duplicate.messageId },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { username: true, discordId: true },
            },
          },
        });

        console.log(`\n🔗 messageId: ${duplicate.messageId}`);
        events.forEach((event, index) => {
          console.log(
            `  ${index + 1}. ID: ${event.id}, 사용자: ${event.user.username}, 생성일: ${event.createdAt}`
          );
        });
      }
    } else {
      console.log(
        "✅ 중복된 messageId가 없습니다. 마이그레이션을 안전하게 진행할 수 있습니다."
      );
    }

    return duplicates;
  } catch (error) {
    console.error("❌ 중복 확인 중 오류 발생:", error);
    throw error;
  }
}

async function cleanupDuplicates() {
  console.log("\n🧹 중복 데이터 정리 시작...");

  try {
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "messageId", 
        COUNT(*) as count
      FROM discord_event 
      WHERE "messageId" IS NOT NULL 
      GROUP BY "messageId" 
      HAVING COUNT(*) > 1;
    `;

    if (duplicates.length === 0) {
      console.log("✅ 정리할 중복 데이터가 없습니다.");
      return;
    }

    let totalDeleted = 0;

    for (const duplicate of duplicates) {
      // 가장 오래된 데이터 하나만 남기고 나머지 삭제
      const events = await prisma.discordEvent.findMany({
        where: { messageId: duplicate.messageId },
        orderBy: { createdAt: "asc" },
      });

      if (events.length > 1) {
        // 첫 번째(가장 오래된) 데이터를 제외하고 나머지 삭제
        const toDelete = events.slice(1);

        for (const event of toDelete) {
          // 연결된 보상 기록도 함께 삭제
          await prisma.rewardHistory.deleteMany({
            where: { discordEventId: event.id },
          });

          await prisma.discordEvent.delete({
            where: { id: event.id },
          });

          totalDeleted++;
          console.log(
            `🗑️ 삭제됨: ID ${event.id}, messageId: ${event.messageId}`
          );
        }
      }
    }

    console.log(`\n✅ 총 ${totalDeleted}개의 중복 데이터가 정리되었습니다.`);
  } catch (error) {
    console.error("❌ 중복 정리 중 오류 발생:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("🚀 중복 데이터 확인 및 정리 시작\n");

    const duplicates = await checkDuplicateMessages();

    if (duplicates.length > 0) {
      console.log(
        "\n⚠️  중복 데이터가 발견되었습니다. 정리를 진행하시겠습니까?"
      );
      console.log("정리하려면 다음 명령을 실행하세요:");
      console.log("node scripts/check-duplicate-messages.js --cleanup");

      // 명령줄 인수 확인
      if (process.argv.includes("--cleanup")) {
        await cleanupDuplicates();

        // 정리 후 재확인
        console.log("\n🔄 정리 후 재확인...");
        await checkDuplicateMessages();
      }
    }

    console.log("\n🎉 작업 완료");
  } catch (error) {
    console.error("❌ 작업 중 오류 발생:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
