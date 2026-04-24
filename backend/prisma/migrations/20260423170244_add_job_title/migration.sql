/*
  Warnings:

  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "department",
ADD COLUMN     "job_title" VARCHAR(100);

-- DropEnum
DROP TYPE "Department";
