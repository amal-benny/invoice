-- CreateTable
CREATE TABLE `InvoiceSequence` (
    `year` INTEGER NOT NULL,
    `last` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
