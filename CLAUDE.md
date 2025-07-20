# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Must

- always respond in korean

## Development Commands

```bash
# Development
pnpm dev                    # Start development server with hot reload
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm clean                  # Clean dist directory

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate:create      # Create new migration

# Discord Commands
pnpm deploy-commands        # Deploy Discord slash commands

# Testing
pnpm test                   # Run all tests
pnpm test:watch            # Run tests in watch mode
pnpm test:coverage         # Generate test coverage report

# Build Verification
pnpm build:production      # Clean + generate + build pipeline
pnpm verify:build          # Verify build integrity
```

## Architecture Overview

This Discord bot follows **Clean Architecture** principles with clear separation of concerns:

### Layer Structure

- **Domain Layer** (`src/domain/`): Pure business logic, entities, and interfaces

  - `entities/`: Core domain objects (User, Level, Reward)
  - `repositories/`: Repository interfaces (IUserRepository, ILevelRepository)
  - `services/`: Service interfaces (IDiscordService)

- **Application Layer** (`src/application/`): Business services and workflows

  - `services/`: Application services (CommandableChannelService)

- **Infrastructure Layer** (`src/infrastructure/`): External dependencies and implementations

  - `persistence/`: Prisma repository implementations

- **Legacy Services** (`src/services/`): Legacy code being gradually migrated

### Entry Points

- **Discord Bot**: Handles Discord events and slash commands
- **Express API**: REST API for administrative tasks and migrations

## Key Technologies

- **TypeScript**: ESNext modules with strict type checking
- **Discord.js v14**: Discord bot framework
- **Prisma**: Database ORM with PostgreSQL
- **Vitest**: Testing framework with 80%+ coverage requirements
- **Express**: API server for administrative endpoints

## Database Schema

Core entities:

- `DiscordUser`: User profiles with reward/level tracking
- `DiscordEvent`: Activity events for reward calculation
- `RewardHistory`: Audit trail of all reward transactions
- `Level`: Level progression system with role assignments
- `RewardableChannel`: Channel-specific reward configurations

## Testing Strategy

- **Unit Tests**: Mock-based testing of business logic (Application layer)
- **Coverage Target**: 80% minimum for Application layer
- **Test Files**: Located in `__tests__/` with parallel structure to `src/`
- **Setup**: Global test setup in `__tests__/setup.ts`

## Environment Variables

Required environment variables (validated in `src/config.ts`):

- `DISCORD_TOKEN`: Discord bot token
- `DISCORD_CLIENT_ID`: Discord application client ID
- `DISCORD_GUILD_ID`: Target Discord server ID
- `DATABASE_URL`: PostgreSQL connection string
- `API_SECRET_KEY`: API authentication secret

## Development Workflow

1. **Business Logic Changes**:

   - Write tests first in `__tests__/application/services/`
   - Implement application services in `src/application/services/`
   - Update domain interfaces if needed

2. **Database Changes**:

   - Modify `prisma/schema.prisma`
   - Run `pnpm db:migrate:create` to generate migration
   - Run `pnpm db:generate` to update Prisma client

3. **Discord Command Changes**:

   - Update command definitions in `src/bot/`
   - Run `pnmp deploy-commands` to sync with Discord

4. **Before Committing**:
   - Run `pnpm test` to ensure all tests pass
   - Run `pnpm build:production` to verify build
   - Check test coverage with `pnpm test:coverage`

## API Endpoints

Base URL: `http://localhost:3000`
Authentication: `Authorization: Bearer <API_SECRET_KEY>`

- `POST /api/discord/migrate`: Migrate historical channel data
- `GET /api/discord/status`: Bot status information
- `GET /api/discord/health`: Health check (no auth required)

## Migration Notes

The codebase is transitioning from a service-based architecture to Clean Architecture:

- New features should follow Clean Architecture patterns
- Legacy services in `src/services/` are being gradually refactored
- Use dependency injection and interfaces for testability

## Build Configuration

- **TypeScript**: ES2022 target with ESNext modules
- **Output**: `dist/` directory with source maps
- **Module Resolution**: Bundler strategy for modern tooling
- **Strict Mode**: Enabled for type safety

<c2c-rules>
- @c2c-rules/_root.md
</c2c-rules>