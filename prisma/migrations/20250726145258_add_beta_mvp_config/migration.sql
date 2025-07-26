-- CreateTable
CREATE TABLE "beta_mvp_coupon" (
    "id" SERIAL NOT NULL,
    "discordUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proCouponCode" TEXT NOT NULL,
    "max5CouponCode" TEXT NOT NULL,
    "max20CouponCode" TEXT NOT NULL,

    CONSTRAINT "beta_mvp_coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_mvp_coupon_discordUserId_key" ON "beta_mvp_coupon"("discordUserId");

-- AddForeignKey
ALTER TABLE "beta_mvp_coupon" ADD CONSTRAINT "beta_mvp_coupon_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "discord_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
