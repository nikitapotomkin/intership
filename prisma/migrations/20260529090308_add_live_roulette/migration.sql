/*
  Warnings:

  - You are about to drop the column `providerId` on the `users` table. All the data in the column will be lost.
  - Made the column `client_seed` on table `game_sessions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_user_id_fkey";

-- DropIndex
DROP INDEX "game_sessions_user_id_idx";

-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN     "live_room_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "client_seed" SET NOT NULL,
ALTER COLUMN "client_seed" SET DEFAULT 'default-client-seed';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "providerId",
ADD COLUMN     "provider_id" TEXT;

-- CreateTable
CREATE TABLE "live_roulette_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_bet" DECIMAL(65,30) NOT NULL DEFAULT 0.01,
    "max_bet" DECIMAL(65,30) NOT NULL DEFAULT 100000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_roulette_rooms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_live_room_id_fkey" FOREIGN KEY ("live_room_id") REFERENCES "live_roulette_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
