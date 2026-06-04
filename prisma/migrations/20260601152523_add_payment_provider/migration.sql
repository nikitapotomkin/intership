/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('CARD', 'CRYPTO', 'WALLET', 'BANK', 'OTHER');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provider_id" INTEGER,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PaymentProviderType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
