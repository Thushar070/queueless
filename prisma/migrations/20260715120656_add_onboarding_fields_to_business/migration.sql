-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
