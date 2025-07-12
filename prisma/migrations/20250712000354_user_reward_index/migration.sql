-- CreateIndex
CREATE INDEX "discord_user_currentReward_currentLevel_idx" ON "discord_user"("currentReward", "currentLevel");

-- CreateIndex
CREATE INDEX "discord_user_currentReward_idx" ON "discord_user"("currentReward");
