-- CreateEnum
CREATE TYPE "Department" AS ENUM ('DEVELOPER', 'TESTING', 'DESIGN', 'PRODUCT_MANAGER', 'DEVOPS', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" "Department";
