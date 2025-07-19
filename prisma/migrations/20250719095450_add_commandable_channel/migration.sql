-- CreateTable
CREATE TABLE "commandable_channels" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandable_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commandable_channels_channelId_key" ON "commandable_channels"("channelId");

-- CreateIndex
CREATE INDEX "commandable_channels_channelId_idx" ON "commandable_channels"("channelId");
