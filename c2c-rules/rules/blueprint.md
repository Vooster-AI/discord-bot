# **Discord Bot Server 유스케이스 및 기술 명세 (최종본)**

## 1. 프로젝트 개요

Discord 서버와 연동하여 사용자 활동을 추적하고, 포인트 기반의 보상 및 레벨 시스템을 제공하는 Bot Server를 구축합니다.

## 2. 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Discord API**: **Discord.js v14**
- **Language**: TypeScript (권장)

## 3. 핵심 기능

### 3.1 Discord Event 처리

- 일반 채널 메시지 수신
- 포럼 채널 게시물 및 댓글 수신
- 보상 대상 채널에서 발생한 활동에 대한 포인트 자동 지급

### 3.2 사용자 레벨 시스템

- 누적 포인트를 기반으로 한 레벨 시스템
- 레벨 달성 시 Discord 역할 자동 부여
- 슬래시 커맨드(`/`)를 통한 사용자 정보 조회

### 3.3 관리 기능

- 지정된 채널의 과거 메시지, 게시물, 댓글에 대한 데이터 마이그레이션
- 관리자 권한의 수동 보상 지급 기능

## 4. 데이터베이스 설계

### 4.1 ERD 및 테이블 구조

- **discord_user**: Discord의 사용자 이름 정책 변경에 따라 `discriminator`를 `Nullable`로 처리하고 `global_name`을 추가했습니다.
- **level**: `discord_role` 테이블과의 관계를 명확히 하기 위해 `discord_role_id`(테이블 PK)를 외래 키로 사용하도록 수정했습니다.
- **인덱싱**: 자주 조회될 컬럼(`discord_user_id`, `channel_id`)에 인덱스를 추가하여 조회 성능을 최적화합니다.

```sql
-- discord_user 테이블
CREATE TABLE discord_user (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    global_name VARCHAR(255), -- 새로운 표시 이름
    discriminator VARCHAR(10), -- NULL을 허용하도록 변경
    avatar_url TEXT,
    current_reward INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    vooster_email VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_discord_user_discord_id ON discord_user(discord_id);

-- discord_event 테이블
CREATE TABLE discord_event (
    id SERIAL PRIMARY KEY,
    discord_user_id INTEGER REFERENCES discord_user(id),
    event_type VARCHAR(50) NOT NULL, -- 'message', 'forum_post', 'comment'
    channel_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_discord_event_user_id ON discord_event(discord_user_id);
CREATE INDEX idx_discord_event_channel_id ON discord_event(channel_id);


-- discord_role 테이블
CREATE TABLE discord_role (
    id SERIAL PRIMARY KEY,
    discord_role_id VARCHAR(255) UNIQUE NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- reward_history 테이블
CREATE TABLE reward_history (
    id SERIAL PRIMARY KEY,
    discord_user_id INTEGER REFERENCES discord_user(id),
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'message', 'forum_post', 'comment', 'manual'
    reason TEXT,
    discord_event_id INTEGER REFERENCES discord_event(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reward_history_user_id ON reward_history(discord_user_id);

-- rewardable_channel 테이블
CREATE TABLE rewardable_channel (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    channel_name VARCHAR(255),
    message_reward_amount INTEGER DEFAULT 0,
    comment_reward_amount INTEGER DEFAULT 0,
    forum_post_reward_amount INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- level 테이블
CREATE TABLE level (
    id SERIAL PRIMARY KEY,
    level_number INTEGER UNIQUE NOT NULL,
    required_reward_amount INTEGER NOT NULL,
    level_name VARCHAR(255) NOT NULL,
    -- discord_role 테이블의 PK를 참조하도록 수정
    discord_role_table_id INTEGER REFERENCES discord_role(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 초기 데이터 설정

```sql
-- 레벨 시스템 초기 데이터
-- 참고: 아래 INSERT 구문 실행 전, discord_role 테이블에 역할 데이터가 먼저 삽입되어 있어야 합니다.
-- 예시: INSERT INTO discord_role (id, discord_role_id, role_name) VALUES (1, '실제_BETA_MVP_역할_ID', 'Beta MVP');

INSERT INTO level (level_number, required_reward_amount, level_name, discord_role_table_id) VALUES
(1, 0, 'Newbie', NULL),
(2, 5, 'Regular', NULL),
(3, 15, 'Beta MVP', 1), -- BETA_MVP_ROLE_ID를 가진 discord_role.id가 1이라고 가정
(4, 50, 'Active', NULL),
(5, 100, 'Contributor', 2), -- CONTRIBUTOR_ROLE_ID를 가진 discord_role.id가 2라고 가정
(6, 200, 'Veteran', NULL),
(7, 500, 'Ambassador', 3); -- AMBASSADOR_ROLE_ID를 가진 discord_role.id가 3이라고 가정
```

## 5. 유스케이스 명세

### 5.1 사용자 활동 추적

**UC-001: 일반 채널 메시지 처리**

- **액터**: Discord Bot
- **전제조건**: Bot이 서버에 연결되어 있으며, `GatewayIntentBits.MessageContent` 인텐트가 활성화됨.
- **주요 시나리오**:
  1.  사용자가 일반 채널에 메시지 작성
  2.  Bot이 `messageCreate` 이벤트 수신
  3.  사용자 정보 확인/생성 (`discord_user`)
  4.  `discord_event` 테이블에 이벤트 저장
  5.  해당 채널이 보상 대상인지 확인
  6.  보상 대상일 경우 포인트 지급 및 레벨 업데이트 처리

**UC-002: 포럼 채널 게시물 처리**

- **액터**: Discord Bot
- **전제조건**: Bot이 포럼 채널에 접근 권한이 있음.
- **주요 시나리오**:
  1.  사용자가 포럼 채널에 게시물(스레드) 작성
  2.  Bot이 `threadCreate` 이벤트 수신
  3.  게시물 정보 저장 및 보상 처리

**UC-003: 댓글 처리**

- **액터**: Discord Bot
- **전제조건**: Bot이 해당 채널/스레드에 접근 권한이 있음.
- **주요 시나리오**:
  1.  사용자가 일반 스레드 또는 포럼 게시물에 댓글 작성
  2.  Bot이 `messageCreate` 이벤트 수신
  3.  `message.channel.isThread()`를 통해 댓글이 스레드 내에서 작성되었는지 확인
  4.  댓글 정보 저장 및 보상 처리

### 5.2 보상 시스템

**UC-004: 자동 보상 지급**

- **액터**: Discord Bot
- **전제조건**: 사용자 활동이 보상 대상 채널에서 발생
- **주요 시나리오**:
  1.  보상 대상 활동 감지
  2.  해당 활동 유형에 따른 포인트 계산
  3.  사용자 누적 포인트 업데이트
  4.  레벨 변경 확인 및 역할 부여
  5.  `reward_history`에 기록

**UC-005: 레벨 업 및 역할 부여**

- **액터**: Discord Bot
- **전제조건**: 사용자의 누적 포인트가 다음 레벨 요구사항을 충족
- **주요 시나리오**:
  1.  포인트 업데이트 시 레벨 확인
  2.  레벨 업 조건 충족 시 레벨 업데이트
  3.  해당 레벨에 연결된 Discord 역할 부여
  4.  사용자에게 레벨 업 알림

### 5.3 슬래시 커맨드

**UC-006: /level 커맨드**

- **액터**: Discord 사용자
- **전제조건**: 지정된 채널에서 커맨드 사용
- **주요 시나리오**:
  1.  사용자가 `/level [user]` 커맨드 입력
  2.  대상 사용자의 정보 조회
  3.  현재 경험치, 레벨, 다음 레벨까지의 진행률 계산
  4.  임베드 형태로 정보 표시

**UC-007: /top 커맨드**

- **액터**: Discord 사용자
- **전제조건**: 지정된 채널에서 커맨드 사용
- **주요 시나리오**:
  1.  사용자가 `/top` 커맨드 입력
  2.  상위 5명의 사용자 정보 조회
  3.  순위, 이름, 레벨 정보를 임베드로 표시

**UC-008: /vooster 커맨드**

- **액터**: Discord 사용자
- **전제조건**: 지정된 채널에서 커맨드 사용
- **주요 시나리오**:
  1.  사용자가 `/vooster [email]` 커맨드 입력
  2.  사용자의 `vooster_email` 업데이트
  3.  성공 메시지 표시

### 5.4 데이터 마이그레이션

**UC-009: 기존 데이터 마이그레이션**

- **액터**: 관리자
- **전제조건**: API 엔드포인트 접근 권한 보유
- **주요 시나리오**:
  1.  관리자가 마이그레이션 API 호출
  2.  지정된 채널의 기존 메시지/게시물/댓글 조회
      - Discord API 요청 제한(Rate Limit)을 준수하기 위해 `channel.messages.fetch({ limit: 100, before: messageId })`와 같이 페이지네이션(Pagination)을 사용하여 순차적으로 데이터를 가져옴
  3.  가져온 데이터를 각 테이블에 저장
  4.  보상 대상 활동에 대해 소급하여 포인트 지급

## 6. API 엔드포인트 설계

### 6.1 Discord Bot 관련

```typescript
// 기존 데이터 마이그레이션 (관리자용)
POST /api/discord/migrate
- Request Body: { "channelId": "string", "limit": "number" }
- 기존 채널 데이터 가져오기 및 처리
```

### 6.2 사용자 관리

- **참고**: 관리자용 엔드포인트는 반드시 JWT, API Key 등 적절한 인증/인가 미들웨어를 통해 보호되어야 합니다.

```typescript
// 사용자 정보 조회
GET /api/users/:discordId
- 특정 사용자 정보 및 통계 조회

// 사용자 리스트 조회
GET /api/users
- 전체 사용자 목록 (페이징 지원)

// 수동 보상 지급 (관리자용)
POST /api/users/:discordId/rewards
- 관리자 권한으로 수동 보상 지급
```

### 6.3 통계 및 리포트

```typescript
// 리더보드 조회
GET /api/leaderboard
- 상위 사용자 목록

// 채널 통계
GET /api/channels/:channelId/stats
- 특정 채널의 활동 통계

// 전체 통계
GET /api/stats
- 서버 전체 통계 정보
```

## 7. 기술 구현 세부사항

### 7.1 프로젝트 구조

```
discord-bot-server/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   │   ├── level.ts
│   │   │   ├── top.ts
│   │   │   └── vooster.ts
│   │   ├── events/
│   │   │   ├── messageCreate.ts
│   │   │   ├── threadCreate.ts
│   │   │   └── ready.ts
│   │   └── index.ts
│   ├── api/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/  // 인증/인가 미들웨어
│   ├── services/
│   │   ├── discordService.ts
│   │   ├── userService.ts
│   │   ├── rewardService.ts
│   │   └── levelService.ts
│   ├── utils/
│   │   ├── database.ts
│   │   └── helpers.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env
├── package.json
└── README.md
```

### 7.2 환경 변수

```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
# 참고: Discord.js v14 에서는 Gateway Intents를 코드에서 명시적으로 선언해야 함
# 예: GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent

# Supabase
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server
PORT=3000
NODE_ENV=development
```

### 7.3 핵심 서비스 클래스 설계

```typescript
// UserService
class UserService {
  async findOrCreateUser(discordId: string, userData: any): Promise<User>;
  async updateUserReward(userId: number, amount: number): Promise<User>;
  async checkLevelUp(userId: number): Promise<boolean>;
  async getLeaderboard(limit: number): Promise<User[]>;
}

// RewardService
class RewardService {
  async giveReward(
    userId: number,
    amount: number,
    type: string,
    reason?: string
  ): Promise<void>;
  async getRewardHistory(userId: number): Promise<RewardHistory[]>;
  async calculateRewardAmount(
    channelId: string,
    eventType: string
  ): Promise<number>;
}

// LevelService
class LevelService {
  async getCurrentLevel(totalReward: number): Promise<Level>;
  async getNextLevel(currentLevel: number): Promise<Level | null>;
  async assignDiscordRole(userId: string, roleId: string): Promise<void>;
}
```

## 8. 보안 및 성능 고려사항

### 8.1 보안

- Discord Bot 토큰 및 API Key 등 민감 정보는 `.env` 파일로 관리하고, Git에 포함되지 않도록 `.gitignore`에 추가합니다.
- 관리자용 API 엔드포인트에 대해 역할 기반 접근 제어(RBAC)를 구현합니다.
- 사용자 입력 데이터(예: `/vooster` 커맨드의 이메일)는 데이터베이스 저장 전 유효성 검사 및 정제(Sanitization)를 수행합니다.
- 악의적인 API 요청을 방지하기 위해 `express-rate-limit` 등을 사용하여 Rate Limiting을 구현합니다.

### 8.2 성능

- 데이터베이스 조회 성능 향상을 위해 설계 단계에서 명시한 대로 **인덱스를 적극적으로 활용**합니다.
- 대용량 데이터 처리(마이그레이션 등) 시 모든 데이터를 메모리에 올리지 않고, 스트림이나 배치(Batch) 방식으로 처리하여 메모리 사용량을 관리합니다.
- Node.js의 장점인 **비동기 처리**를 적극 활용하여 I/O 작업 중에도 다른 요청을 처리할 수 있도록 합니다.

## 9. 모니터링 및 로깅

- 구조화된 로깅 라이브러리(예: Winston, pino)를 사용하여 로그를 기록합니다.
- Sentry, Datadog 등 에러 추적 서비스를 연동하여 운영 중 발생하는 에러를 실시간으로 추적하고 알림을 받습니다.
- Prisma 로깅 기능을 활용하여 실행되는 데이터베이스 쿼리를 모니터링하고, 느린 쿼리를 최적화합니다.

## 10. 배포 및 운영

- Docker를 사용하여 애플리케이션을 컨테이너화하여 일관된 배포 환경을 구축합니다.
- GitHub Actions, Jenkins 등을 활용하여 CI/CD 파이프라인을 구성하고, 테스트 및 배포를 자동화합니다.
- `development`, `staging`, `production` 등 환경별로 설정을 분리하여 관리합니다.
- Supabase의 백업 기능을 활용하거나 별도의 스크립트를 작성하여 정기적인 데이터베이스 백업 및 복구 전략을 수립합니다.