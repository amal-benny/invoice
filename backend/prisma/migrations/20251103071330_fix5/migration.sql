/*
  Warnings:

  - The primary key for the `invoicesequence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdById` on the `invoicesequence` table. All the data in the column will be lost.
  - You are about to drop the column `prefix` on the `invoicesequence` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Made the column `invoiceNumber` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_customerId_fkey`;

-- DropIndex
DROP INDEX `Invoice_createdById_invoiceNumber_key` ON `invoice`;

-- DropIndex
DROP INDEX `Invoice_customerId_idx` ON `invoice`;

-- DropIndex
DROP INDEX `InvoiceSequence_createdById_idx` ON `invoicesequence`;

-- AlterTable
ALTER TABLE `invoice` MODIFY `invoiceNumber` VARCHAR(191) NOT NULL,
    MODIFY `type` ENUM('QUOTE', 'INVOICE') NOT NULL DEFAULT 'INVOICE',
    MODIFY `customerId` INTEGER NULL,
    MODIFY `createdById` INTEGER NULL,
    MODIFY `total` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE `invoicesequence` DROP PRIMARY KEY,
    DROP COLUMN `createdById`,
    DROP COLUMN `prefix`,
    ADD PRIMARY KEY (`year`);

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_invoiceNumber_key` ON `Invoice`(`invoiceNumber`);

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
