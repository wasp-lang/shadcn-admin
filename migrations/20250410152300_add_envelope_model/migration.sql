-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "allocatedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envelope_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
