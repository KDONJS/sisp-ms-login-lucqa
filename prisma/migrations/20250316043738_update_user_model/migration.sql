-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TECNICO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "shift" "Shift",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
