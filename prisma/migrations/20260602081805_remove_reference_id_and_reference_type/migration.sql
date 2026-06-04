/*
  Warnings:

  - You are about to drop the column `reference_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_type` on the `transactions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "transactions_reference_id_idx";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "reference_id",
DROP COLUMN "reference_type";
