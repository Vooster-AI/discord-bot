# Discord Bot - 클린 아키텍처 (Clean Architecture) 구현

## 🎯 목표 달성

이 프로젝트는 **클린 아키텍처와 의존성 주입(Dependency Injection)**을 적용하여 **단위 테스트가 가능한 구조**로 리팩토링되었습니다.

### ✅ 달성된 결과

- **20개의 단위 테스트** 성공적으로 통과
- **Application Layer 82.75% 테스트 커버리지** 달성
- **완전한 외부 의존성 분리** (Discord.js, Prisma)
- **Mock 객체를 통한 순수한 비즈니스 로직 테스트**

## 🏗 아키텍처 구조

### 계층별 역할 분담

```
📁 src/
├── 🔵 domain/              # 📋 Domain Layer (가장 순수한 계층)
│   ├── entities/           # 도메인 엔티티 (User, Level, Reward)
│   ├── repositories/       # 저장소 인터페이스 (IUserRepository, ILevelRepository)
│   └── services/           # 서비스 인터페이스 (IDiscordService)
│
├── 🟢 application/         # 🎯 Application Layer (비즈니스 로직)
│   └── use-cases/          # 유스케이스 구현 (GrantRewardUseCase, GetUserProfileUseCase)
│
├── 🟡 infrastructure/      # 🔧 Infrastructure Layer (외부 의존성 구현)
│   ├── persistence/        # Prisma 저장소 구현체
│   ├── discord/            # Discord.js 서비스 구현체
│   └── entrypoints/        # 진입점 (Bot, API)
│
└── 🔴 기존 services/       # ⚠️ 레거시 (점진적 마이그레이션 예정)
```

### 의존성 방향

```
Infrastructure Layer → Application Layer → Domain Layer
     (구현체)              (유스케이스)         (인터페이스)
        ↓                      ↓                ↓
  PrismaUserRepository → GrantRewardUseCase ← IUserRepository
  DiscordJsService     → GetUserProfile    ← IDiscordService
```

## 🧪 테스트 전략

### TDD 사이클 적용

```
🔴 Red → 🟢 Green → 🔵 Refactor
  ↓         ↓          ↓
실패테스트   최소구현    코드정리
```

### 테스트 피라미드

- **Unit Tests (70%)**: 순수한 비즈니스 로직 검증
- **Integration Tests (20%)**: 계층 간 상호작용 검증
- **E2E Tests (10%)**: 전체 시스템 검증

### 현재 테스트 현황

```bash
Test Suites: 3 passed
Tests:       20 passed
Coverage:    82.75% (Application Layer)

✅ GrantRewardUseCase      - 6 tests
✅ GetUserProfileUseCase   - 7 tests
✅ UpdateVoosterEmailUseCase - 7 tests
```

## 💡 핵심 개념

### 1. 의존성 역전 원칙 (Dependency Inversion Principle)

**Before (문제)**: 비즈니스 로직이 외부 라이브러리에 의존

```typescript
// ❌ 테스트 불가능한 구조
class RewardService {
  static async processReward() {
    const user = await prisma.user.findUnique(); // 직접 의존
    await member.roles.add(roleId); // 직접 의존
  }
}
```

**After (해결)**: 인터페이스를 통한 의존성 분리

```typescript
// ✅ 테스트 가능한 구조
class GrantRewardUseCase {
  constructor(
    private userRepository: IUserRepository, // 인터페이스 의존
    private discordService: IDiscordService // 인터페이스 의존
  ) {}

  async execute() {
    const user = await this.userRepository.findOrCreate(); // 추상화된 호출
    await this.discordService.assignRole(); // 추상화된 호출
  }
}
```

### 2. 순수한 단위 테스트

**Mock 객체 활용**:

```typescript
describe("GrantRewardUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      findOrCreate: jest.fn().mockResolvedValue(mockUser),
      updatePoints: jest.fn().mockResolvedValue(updatedUser),
      // ... 모든 메서드를 Mock으로 대체
    };
  });

  it("메시지 작성 시 포인트가 증가해야 한다", async () => {
    // Given - 테스트 데이터 준비
    // When - 실제 비즈니스 로직 실행
    // Then - 결과 검증 (외부 의존성 없이!)
  });
});
```

## 🚀 사용법

### 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# 테스트 커버리지 확인
pnpm test:coverage

# 특정 테스트만 실행
pnpm test -- --testNamePattern="GrantRewardUseCase"

# 워치 모드로 실행
pnpm test:watch
```

### 새로운 유스케이스 추가

1. **Domain Layer**: 필요한 인터페이스 정의
2. **Application Layer**: 유스케이스 구현
3. **Infrastructure Layer**: 구현체 작성
4. **Tests**: 단위 테스트 작성

예시:

```typescript
// 1. 인터페이스 정의 (domain/repositories/notification.repository.ts)
export interface INotificationRepository {
  send(userId: string, message: string): Promise<void>;
}

// 2. 유스케이스 구현 (application/use-cases/send-notification.use-case.ts)
export class SendNotificationUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(userId: string, message: string) {
    await this.notificationRepo.send(userId, message);
  }
}

// 3. 구현체 작성 (infrastructure/notification/discord-notification.repository.ts)
export class DiscordNotificationRepository implements INotificationRepository {
  async send(userId: string, message: string) {
    // Discord API 호출
  }
}

// 4. 테스트 작성 (__tests__/application/use-cases/send-notification.use-case.test.ts)
describe("SendNotificationUseCase", () => {
  // Mock을 사용한 단위 테스트
});
```

## 📊 이점

### 개발 경험 개선

- **🚀 빠른 피드백**: 외부 의존성 없는 테스트로 즉시 결과 확인
- **🔍 정확한 디버깅**: 문제 발생 시 정확한 위치 특정 가능
- **✅ 신뢰성**: 변경 사항이 기존 기능에 미치는 영향 사전 검증

### 코드 품질 향상

- **📦 모듈화**: 각 계층의 책임이 명확히 분리
- **🔄 재사용성**: 비즈니스 로직을 다른 환경에서도 활용 가능
- **🛠 유지보수성**: 외부 라이브러리 변경 시 영향 범위 최소화

### 팀 협업 효율성

- **🎯 병렬 개발**: 인터페이스 정의 후 각 계층을 독립적으로 개발
- **📖 문서화**: 테스트 자체가 코드의 사용법과 기대 동작을 문서화
- **🔒 안정성**: 리팩토링 시 기능 보장

## 🔮 향후 계획

### 점진적 마이그레이션

1. **기존 services/ 디렉토리** → **application/use-cases/로 이전**
2. **Integration 테스트** 추가
3. **E2E 테스트** 구축
4. **성능 테스트** 도입

### 확장 계획

- **Command Query Responsibility Segregation (CQRS)** 패턴 적용
- **Event Sourcing** 도입으로 감사 로그 구현
- **Domain Events** 활용한 비동기 처리

## 📚 참고 자료

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Jest Testing Framework](https://jestjs.io/)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

---

> 💡 **핵심 메시지**: 클린 아키텍처는 단순히 폴더 구조의 변경이 아닙니다. **비즈니스 로직을 외부 세계로부터 보호하여 안정적이고 테스트 가능한 코드**를 만드는 것이 목표입니다.
