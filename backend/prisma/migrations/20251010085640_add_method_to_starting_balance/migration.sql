/*
  Warnings:

  - Added the required column `method` to the `StartingBalance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `startingbalance` ADD COLUMN `method` VARCHAR(191) NOT NULL;
