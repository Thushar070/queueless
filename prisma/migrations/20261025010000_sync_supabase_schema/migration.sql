-- Bring the connected Supabase database in line with the current Prisma schema.
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT;

ALTER TABLE "Staff"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Queue"
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT;

ALTER TABLE "QueueEntry"
  ADD COLUMN IF NOT EXISTS "threeAwayNotifiedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Section" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhoneVerification" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "QueueEntry_joinedAt_idx" ON "QueueEntry"("joinedAt");
CREATE INDEX IF NOT EXISTS "QueueEntry_completedAt_idx" ON "QueueEntry"("completedAt");
CREATE INDEX IF NOT EXISTS "Section_businessId_idx" ON "Section"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "Section_businessId_name_key" ON "Section"("businessId", "name");
CREATE INDEX IF NOT EXISTS "PhoneVerification_phone_idx" ON "PhoneVerification"("phone");
CREATE INDEX IF NOT EXISTS "PhoneVerification_businessId_idx" ON "PhoneVerification"("businessId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Queue_sectionId_fkey'
      AND conrelid = '"Queue"'::regclass
  ) THEN
    ALTER TABLE "Queue"
      ADD CONSTRAINT "Queue_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "Section"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Section_businessId_fkey'
      AND conrelid = '"Section"'::regclass
  ) THEN
    ALTER TABLE "Section"
      ADD CONSTRAINT "Section_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
