-- CreateTable
CREATE TABLE `invoice_sequences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `last` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `invoice_sequences_userId_year_prefix_key`(`userId`, `year`, `prefix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
