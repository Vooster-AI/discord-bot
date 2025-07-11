# **Discord Bot Server (Clean Architecture Edition)**

Discord 서버와 연동하여 사용자 활동을 추적하고, 포인트 기반의 보상 및 레벨 시스템을 제공하는 고품질 TypeScript 봇 서버입니다. 이 프로젝트는 **클린 아키텍처(Clean Architecture)** 와 **테스트 주도 개발(TDD)** 원칙을 기반으로 설계되어 뛰어난 안정성, 확장성, 그리고 유지보수성을 자랑합니다.

[![Test Coverage](https://img.shields.io/badge/Coverage-82.75%25-brightgreen)](./coverage/index.html)
[![Build Status](https://img.shields.io/badge/Build-Passing-success)](https://github.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)

## ✨ 핵심 가치

- **✅ 테스트 가능성 (Testability)**: 비즈니스 로직과 외부 의존성(Discord.js, Prisma)을 완벽히 분리하여, 순수한 단위 테스트를 통해 핵심 로직의 안정성을 100% 보장합니다.
- **📦 모듈화 및 유연성 (Modularity & Flexibility)**: 각 계층(Domain, Application, Infrastructure)이 명확한 책임을 가지므로, Discord.js를 다른 라이브러리로 교체하거나 데이터베이스를 변경하더라도 비즈니스 로직의 수정 없이 대응할 수 있습니다.
- **🔧 유지보수성 (Maintainability)**: 의존성 방향이 명확하여 코드 변경 시 영향 범위를 쉽게 예측하고, 새로운 기능을 안전하게 추가할 수 있습니다.

---

## 🏗️ 아키텍처: 클린 아키텍처

이 프로젝트는 Uncle Bob의 클린 아키텍처를 따릅니다. 의존성은 항상 외부에서 내부로 향하며, 이를 통해 핵심 비즈니스 로직을 외부 세계로부터 보호합니다.

![Clean Architecture Diagram](https://blog.cleancoder.com/uncle-bob/images/2012-08-13-the-clean-architecture/CleanArchitecture.jpg)

### 계층별 역할

| 계층 (Layer)                | 디렉토리                         | 역할                                                                                         |
| --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| **Domain (도메인)**         | `src/domain`                     | **순수한 비즈니스 규칙과 데이터 구조(Entity, Interface).** 다른 어떤 계층에도 의존하지 않음. |
| **Application (응용)**      | `src/application`                | **유스케이스(Use Cases) 구현.** 도메인 계층의 인터페이스를 활용하여 비즈니스 로직을 지휘.    |
| **Infrastructure (인프라)** | `src/infrastructure`             | **외부 세계와의 연결(Adapters).** 인터페이스를 실제 라이브러리(Prisma, Discord.js)로 구현.   |
| **Entrypoints (진입점)**    | `src/infrastructure/entrypoints` | **애플리케이션 구동.** Discord Bot 이벤트 핸들러, Express API 라우터가 여기에 해당.          |

자세한 내용은 [CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md) 문서를 참고하세요.

---

## 🛠 기술 스택

| 구분            | 기술                            |
| --------------- | ------------------------------- |
| **Backend**     | Node.js, Express.js             |
| **Language**    | TypeScript                      |
| **Database**    | PostgreSQL (Supabase)           |
| **ORM**         | Prisma                          |
| **Discord API** | Discord.js v14                  |
| **Testing**     | **Vitest**, @vitest/coverage-v8 |
| **Package Mgr** | pnpm                            |

---

## 🚀 시작하기

### 1. 전제 조건

- Node.js (v18 이상 권장)
- pnpm

### 2. 설치 및 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd discord-bot-server

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
# .env.example 파일을 복사하여 .env 파일을 생성하고, 내부 값을 채워주세요.
cp .env.example .env

# 4. 데이터베이스 마이그레이션
# .env 파일의 DATABASE_URL이 올바르게 설정되었는지 확인하세요.
pnpm prisma migrate dev --name init

# 5. Discord에 슬래시 커맨드 배포
# .env 파일의 Discord 관련 변수들이 올바르게 설정되었는지 확인하세요.
pnpm deploy-commands
```

### 3. 서버 실행

```bash
# 개발 모드로 실행 (파일 변경 시 자동 재시작)
pnpm dev

# 프로덕션 모드로 실행
# 먼저 빌드 과정을 거쳐야 합니다.
pnpm build
pnpm start
```

---

## 🧪 테스트

이 프로젝트는 **테스트 주도 개발(TDD)**을 지향하며, 높은 코드 커버리지를 유지합니다.

```bash
# 모든 단위 테스트 실행
pnpm test

# Watch 모드로 테스트 실행
pnpm test:watch

# 테스트 커버리지 리포트 생성
pnpm test:coverage
```

`pnpm test:coverage` 실행 후, `coverage/index.html` 파일을 열어 상세한 커버리지 리포트를 확인할 수 있습니다.

---

## 🔧 API 엔드포인트

API 서버는 데이터 마이그레이션과 같은 관리자용 기능을 제공합니다.

- **기본 URL**: `http://localhost:3000`
- **인증**: 모든 요청은 `Authorization` 헤더에 `Bearer <API_SECRET_KEY>` 형식의 API 키를 포함해야 합니다.

| 메서드 | 경로                   | 설명                                 | 추가 헤더 (`-H`)                |
| ------ | ---------------------- | ------------------------------------ | ------------------------------- |
| `POST` | `/api/discord/migrate` | 과거 채널 기록을 마이그레이션합니다. | `X-Admin-Key: <your_admin_key>` |
| `GET`  | `/api/discord/status`  | 봇 서버의 현재 상태를 확인합니다.    | -                               |
| `GET`  | `/api/discord/health`  | API 서버의 헬스 체크 (인증 불필요)   | -                               |

**요청 예시 (cURL):**

```bash
curl -X POST http://localhost:3000/api/discord/migrate \
  -H "Authorization: Bearer your_api_secret_key" \
  -H "X-Admin-Key: your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
        "channelId": "your_channel_id",
        "limit": 500
      }'
```

---

## 🤝 기여하기

이 프로젝트에 기여하는 것을 환영합니다! 기여 절차는 다음과 같습니다.

1.  이 저장소를 Fork 하세요.
2.  새로운 기능이나 버그 수정을 위한 브랜치를 만드세요. (`git checkout -b feature/amazing-feature`)
3.  **TDD 사이클**(`Red -> Green -> Refactor`)에 따라 테스트를 먼저 작성하고 코드를 구현하세요.
4.  모든 테스트가 통과하는지 확인하세요. (`pnpm test`)
5.  변경 사항을 커밋하세요. (`git commit -m 'feat: Add some amazing feature'`)
6.  브랜치를 Push 하세요. (`git push origin feature/amazing-feature`)
7.  Pull Request를 생성하세요.

## 📄 라이선스

이 프로젝트는 [ISC 라이선스](./LICENSE) 하에 배포됩니다.
