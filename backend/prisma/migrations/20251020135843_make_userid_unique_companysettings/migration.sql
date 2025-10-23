/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `CompanySettings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `CompanySettings_userId_key` ON `CompanySettings`(`userId`);
