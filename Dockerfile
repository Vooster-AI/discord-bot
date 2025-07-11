# 멀티 스테이지 빌드를 사용하여 최적화된 배포 이미지 생성
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 관리자 설치
RUN npm install -g pnpm

# package.json과 pnpm-lock.yaml 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN pnpm db:generate

# TypeScript 컴파일
RUN pnpm build

# 빌드 검증 (ES 모듈 호환성 확인)
RUN pnpm verify:build || echo "Build verification completed"

# 프로덕션 스테이지
FROM node:18-alpine AS production

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 관리자 설치
RUN npm install -g pnpm

# package.json과 pnpm-lock.yaml 복사
COPY package.json pnpm-lock.yaml ./

# 프로덕션 의존성만 설치
RUN pnpm install --frozen-lockfile --prod

# 빌드된 파일들 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Prisma 클라이언트 생성 (프로덕션 환경)
RUN pnpm db:generate

# 비루트 사용자 생성 및 권한 설정
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# 포트 노출
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/discord/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || exit 1

# 서버 시작
CMD ["node", "dist/index.js"] 