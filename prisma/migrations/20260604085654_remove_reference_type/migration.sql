/*
  Warnings:

  - The values [BET,WIN] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `reference_type` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ROULETTE_BET', 'ROULETTE_WIN', 'SLOT_BET', 'SLOT_WIN', 'REFUND');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "reference_type";

-- DropEnum
DROP TYPE "TransactionReferenceType";
