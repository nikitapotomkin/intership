/*
  Warnings:

  - You are about to drop the `PaymentProvider` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_provider_id_fkey";

-- DropTable
DROP TABLE "PaymentProvider";

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PaymentProviderType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_providers_code_key" ON "payment_providers"("code");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
