-- CreateTable
CREATE TABLE "slot_rounds" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "grid" JSONB NOT NULL,
    "winning_lines" JSONB NOT NULL,
    "bet_per_line" DECIMAL(18,2) NOT NULL,
    "active_lines" INTEGER NOT NULL,
    "total_bet" DECIMAL(18,2) NOT NULL,
    "total_payout" DECIMAL(18,2) NOT NULL,
    "scatter_count" INTEGER NOT NULL,
    "is_win" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slot_rounds_user_id_created_at_idx" ON "slot_rounds"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "slot_rounds_is_win_idx" ON "slot_rounds"("is_win");

-- AddForeignKey
ALTER TABLE "slot_rounds" ADD CONSTRAINT "slot_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
