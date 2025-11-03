/*
  Warnings:

  - The primary key for the `invoicesequence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[createdById,invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Made the column `customerId` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdById` on table `invoice` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `createdById` to the `InvoiceSequence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prefix` to the `InvoiceSequence` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_customerId_fkey`;

-- DropIndex
DROP INDEX `Invoice_createdById_fkey` ON `invoice`;

-- DropIndex
DROP INDEX `Invoice_invoiceNumber_key` ON `invoice`;

-- AlterTable
ALTER TABLE `invoice` MODIFY `invoiceNumber` VARCHAR(191) NULL,
    ALTER COLUMN `type` DROP DEFAULT,
    MODIFY `customerId` INTEGER NOT NULL,
    MODIFY `createdById` INTEGER NOT NULL,
    MODIFY `total` DOUBLE NULL,
    MODIFY `status` ENUM('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') NULL,
    MODIFY `currency` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `invoicesequence` DROP PRIMARY KEY,
    ADD COLUMN `createdById` INTEGER NOT NULL,
    ADD COLUMN `prefix` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`year`, `createdById`, `prefix`);

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_createdById_invoiceNumber_key` ON `Invoice`(`createdById`, `invoiceNumber`);

-- CreateIndex
CREATE INDEX `InvoiceSequence_createdById_idx` ON `InvoiceSequence`(`createdById`);

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `Invoice_customerId_fkey` TO `Invoice_customerId_idx`;
