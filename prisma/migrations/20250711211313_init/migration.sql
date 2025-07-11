-- CreateTable
CREATE TABLE "discord_user" (
    "id" SERIAL NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "globalName" TEXT,
    "discriminator" TEXT,
    "avatarUrl" TEXT,
    "currentReward" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "voosterEmail" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_event" (
    "id" SERIAL NOT NULL,
    "discordUserId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "discord_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_role" (
    "id" SERIAL NOT NULL,
    "discordRoleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_history" (
    "id" SERIAL NOT NULL,
    "discordUserId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "discordEventId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewardable_channel" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "messageRewardAmount" INTEGER NOT NULL DEFAULT 0,
    "commentRewardAmount" INTEGER NOT NULL DEFAULT 0,
    "forumPostRewardAmount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewardable_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" SERIAL NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "requiredRewardAmount" INTEGER NOT NULL,
    "levelName" TEXT NOT NULL,
    "discordRoleTableId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discord_user_discordId_key" ON "discord_user"("discordId");

-- CreateIndex
CREATE INDEX "discord_user_discordId_idx" ON "discord_user"("discordId");

-- CreateIndex
CREATE INDEX "discord_event_discordUserId_idx" ON "discord_event"("discordUserId");

-- CreateIndex
CREATE INDEX "discord_event_channelId_idx" ON "discord_event"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "discord_role_discordRoleId_key" ON "discord_role"("discordRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_history_discordEventId_key" ON "reward_history"("discordEventId");

-- CreateIndex
CREATE INDEX "reward_history_discordUserId_idx" ON "reward_history"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "rewardable_channel_channelId_key" ON "rewardable_channel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "level_levelNumber_key" ON "level"("levelNumber");

-- AddForeignKey
ALTER TABLE "discord_event" ADD CONSTRAINT "discord_event_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "discord_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_history" ADD CONSTRAINT "reward_history_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "discord_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_history" ADD CONSTRAINT "reward_history_discordEventId_fkey" FOREIGN KEY ("discordEventId") REFERENCES "discord_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level" ADD CONSTRAINT "level_discordRoleTableId_fkey" FOREIGN KEY ("discordRoleTableId") REFERENCES "discord_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
