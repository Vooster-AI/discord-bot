# Discord Bot Server

TypeScript로 작성된 Discord Bot Server 프로젝트입니다. Discord 서버와 연동하여 사용자 활동을 추적하고, 포인트 기반의 보상 및 레벨 시스템을 제공합니다.

## 📋 주요 기능

- **Discord 이벤트 처리**: 메시지, 포럼 게시물, 댓글 등의 활동 추적
- **포인트 시스템**: 활동에 따른 자동 포인트 지급
- **레벨 시스템**: 누적 포인트 기반 레벨 업그레이드
- **역할 관리**: 레벨에 따른 Discord 역할 자동 부여
- **슬래시 커맨드**: `/level`, `/top`, `/vooster` 등 사용자 친화적 명령어
- **데이터 마이그레이션**: 기존 채널 데이터 소급 적용
- **REST API**: 관리자용 API 엔드포인트 제공

## 🛠 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Discord API**: Discord.js v14
- **Language**: TypeScript
- **Package Manager**: pnpm

## 🚀 시작하기

### 1. 프로젝트 설치

```bash
# 저장소 클론
git clone <repository-url>
cd discord-bot

# 의존성 설치
pnpm install

# TypeScript 컴파일
pnpm build
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Discord Bot Configuration
DISCORD_TOKEN="your_discord_bot_token"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_GUILD_ID="your_discord_guild_id"

# Database Configuration (Supabase/PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/discord_bot"

# Server Configuration
PORT=3000
API_SECRET_KEY="your_strong_api_secret_key"

# Environment
NODE_ENV="development"
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
pnpm prisma:generate

# 데이터베이스 마이그레이션
pnpm prisma:migrate

# 데이터베이스 시드 (선택사항)
# pnpm prisma db seed
```

### 4. 슬래시 커맨드 배포

```bash
# Discord에 슬래시 커맨드 등록
pnpm deploy-commands
```

### 5. 서버 시작

```bash
# 개발 모드 (자동 재시작)
pnpm dev

# 프로덕션 모드
pnpm start
```

## 🎮 Discord Bot 사용법

### 슬래시 커맨드

- `/level [user]` - 사용자의 레벨 정보 확인
- `/top` - 리더보드 확인 (상위 5명)
- `/vooster <email>` - Vooster 이메일 등록

### 자동 포인트 지급

봇이 다음 활동을 감지하면 자동으로 포인트를 지급합니다:

- **일반 메시지**: 설정된 포인트 지급
- **포럼 게시물**: 포럼 게시물 작성 시 포인트 지급
- **댓글**: 스레드 내 댓글 작성 시 포인트 지급

## 🔧 API 엔드포인트

### 인증

모든 API 요청은 `Authorization` 헤더에 Bearer 토큰을 포함해야 합니다:

```bash
Authorization: Bearer your_api_secret_key
```

### 엔드포인트 목록

#### 1. 헬스 체크

```bash
GET /api/discord/health
```

#### 2. 봇 상태 확인

```bash
GET /api/discord/status
Authorization: Bearer your_api_key
```

#### 3. 채널 정보 조회

```bash
GET /api/discord/channels/:channelId
Authorization: Bearer your_api_key
```

#### 4. 데이터 마이그레이션

```bash
POST /api/discord/migrate
Authorization: Bearer your_api_key
X-Admin-Key: your_admin_key
Content-Type: application/json

{
  "channelId": "123456789",
  "limit": 1000
}
```

## 📊 데이터베이스 구조

### 주요 테이블

- **discord_user**: 사용자 정보 및 포인트/레벨 데이터
- **discord_event**: 사용자 활동 이벤트 로그
- **reward_history**: 포인트 지급 기록
- **rewardable_channel**: 보상 대상 채널 설정
- **level**: 레벨 시스템 설정
- **discord_role**: Discord 역할 정보

### ERD

```mermaid
erDiagram
    discord_user ||--o{ discord_event : "has"
    discord_user ||--o{ reward_history : "has"
    discord_event ||--o| reward_history : "generates"
    level ||--o| discord_role : "has"
```

## 🔧 개발 가이드

### 프로젝트 구조

```
src/
├── api/                    # Express API
│   ├── controllers/        # API 컨트롤러
│   ├── middleware/         # 미들웨어
│   └── routes/            # API 라우트
├── bot/                   # Discord Bot
│   ├── commands/          # 슬래시 커맨드
│   ├── events/            # 이벤트 핸들러
│   └── deploy-commands.ts # 명령어 배포
├── services/              # 비즈니스 로직
├── utils/                 # 유틸리티
├── config.ts             # 설정
└── index.ts              # 메인 엔트리포인트
```

### 서비스 클래스

- **UserService**: 사용자 관리 및 레벨 시스템
- **RewardService**: 포인트 지급 및 보상 로직
- **LevelService**: 레벨 계산 및 역할 부여
- **DiscordService**: Discord API 상호작용

### 새로운 기능 추가

1. **새 슬래시 커맨드 추가**:

   - `src/bot/commands/` 디렉토리에 명령어 파일 생성
   - `src/bot/deploy-commands.ts`에 명령어 정의 추가
   - `src/bot/events/interactionCreate.ts`에 핸들러 추가

2. **새 이벤트 핸들러 추가**:

   - `src/bot/events/` 디렉토리에 이벤트 파일 생성
   - `src/bot/index.ts`에 이벤트 등록

3. **새 API 엔드포인트 추가**:
   - `src/api/controllers/`에 컨트롤러 함수 생성
   - `src/api/routes/`에 라우트 등록

## 📈 모니터링 및 로그

### 로그 레벨

- `[Bot]` - Discord Bot 관련 로그
- `[API]` - Express API 관련 로그
- `[Database]` - 데이터베이스 관련 로그
- `[Service]` - 서비스 로직 관련 로그

### 로그 예시

```
[Bot] 봇이 준비되었습니다! BotName#1234로 로그인했습니다.
[API] Express 서버가 포트 3000에서 실행 중입니다.
[UserService] 새 사용자 생성: username (123456789)
[RewardService] 보상 지급 완료: 사용자 1, 5 포인트 (message)
```

## 🔒 보안 고려사항

- 환경 변수로 민감한 정보 관리
- API 키 기반 인증
- 관리자 권한 분리
- 입력 데이터 검증
- Rate Limiting 적용

## 🚨 트러블슈팅

### 일반적인 문제

1. **봇이 메시지를 감지하지 못함**

   - Discord Bot 권한 확인
   - `MessageContent` Intent 활성화 확인

2. **데이터베이스 연결 실패**

   - `DATABASE_URL` 환경 변수 확인
   - 데이터베이스 서버 상태 확인

3. **슬래시 커맨드가 표시되지 않음**
   - `pnpm deploy-commands` 실행
   - 길드 ID 확인

### 로그 확인

```bash
# 실시간 로그 확인
pnpm dev

# 특정 로그 필터링
pnpm dev | grep "\[Bot\]"
```

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/new-feature`)
3. 변경사항 커밋 (`git commit -am 'Add new feature'`)
4. 브랜치 푸시 (`git push origin feature/new-feature`)
5. Pull Request 생성

## 📄 라이센스

이 프로젝트는 ISC 라이센스 하에 배포됩니다.

## 💬 지원

문제가 있거나 질문이 있으시면 다음을 통해 연락해주세요:

- GitHub Issues: 버그 리포트 및 기능 요청
- Discord: 실시간 지원 및 커뮤니티

---

**즐거운 코딩 되세요! 🎉**
