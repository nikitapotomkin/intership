/*
  Warnings:

  - Added the required column `reference_type` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionReferenceType" AS ENUM ('ROULETTE_BET', 'ROULETTE_WIN', 'SLOT_SPIN', 'SLOT_WIN', 'DEPOSIT', 'WITHDRAWAL', 'REFUND');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "reference_type" "TransactionReferenceType" NOT NULL;
