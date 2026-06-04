/*
  Warnings:

  - A unique constraint covering the columns `[transaction_id]` on the table `withdraw_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "withdraw_requests" ADD COLUMN     "transaction_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_requests_transaction_id_key" ON "withdraw_requests"("transaction_id");

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
