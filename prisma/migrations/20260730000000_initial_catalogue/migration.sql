-- CreateTable
CREATE TABLE `manufacturers` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `website_url` VARCHAR(2048) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `manufacturers_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telescopes` (
    `id` CHAR(36) NOT NULL,
    `manufacturer_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `optical_design` VARCHAR(255) NOT NULL,
    `aperture_mm` DECIMAL(9, 3) NOT NULL,
    `native_focal_length_mm` DECIMAL(10, 3) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `source_url` VARCHAR(2048) NOT NULL,
    `verified_at` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `telescopes_slug_key`(`slug`),
    UNIQUE INDEX `telescopes_manufacturer_id_model_key`(`manufacturer_id`, `model`),
    INDEX `telescopes_active_idx`(`active`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cameras` (
    `id` CHAR(36) NOT NULL,
    `manufacturer_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `sensor_name` VARCHAR(255) NOT NULL,
    `sensor_width_mm` DECIMAL(9, 4) NOT NULL,
    `sensor_height_mm` DECIMAL(9, 4) NOT NULL,
    `pixel_size_um` DECIMAL(7, 3) NOT NULL,
    `resolution_width_px` INTEGER UNSIGNED NOT NULL,
    `resolution_height_px` INTEGER UNSIGNED NOT NULL,
    `sensor_type` VARCHAR(100) NOT NULL,
    `colour_mode` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `source_url` VARCHAR(2048) NOT NULL,
    `verified_at` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cameras_slug_key`(`slug`),
    UNIQUE INDEX `cameras_manufacturer_id_model_key`(`manufacturer_id`, `model`),
    INDEX `cameras_active_idx`(`active`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `optical_modifiers` (
    `id` CHAR(36) NOT NULL,
    `manufacturer_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `model` VARCHAR(255) NOT NULL,
    `modifier_type` VARCHAR(100) NOT NULL,
    `multiplier` DECIMAL(7, 4) NOT NULL,
    `compatible_notes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `source_url` VARCHAR(2048) NOT NULL,
    `verified_at` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `optical_modifiers_slug_key`(`slug`),
    UNIQUE INDEX `optical_modifiers_manufacturer_id_model_key`(`manufacturer_id`, `model`),
    INDEX `optical_modifiers_active_idx`(`active`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `astronomical_targets` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `catalogue_name` VARCHAR(255) NOT NULL,
    `common_name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `angular_width_deg` DECIMAL(10, 6) NOT NULL,
    `angular_height_deg` DECIMAL(10, 6) NOT NULL,
    `default_rotation_deg` DECIMAL(7, 3) NOT NULL,
    `asset_path` VARCHAR(2048) NULL,
    `asset_credit` VARCHAR(1024) NULL,
    `asset_license_url` VARCHAR(2048) NULL,
    `source_url` VARCHAR(2048) NOT NULL,
    `verified_at` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `astronomical_targets_slug_key`(`slug`),
    UNIQUE INDEX `astronomical_targets_catalogue_name_key`(`catalogue_name`),
    INDEX `astronomical_targets_category_idx`(`category`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogue_change_log` (
    `id` CHAR(36) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `change_type` VARCHAR(50) NOT NULL,
    `before_json` JSON NULL,
    `after_json` JSON NULL,
    `source_url` VARCHAR(2048) NOT NULL,
    `changed_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalogue_change_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `catalogue_change_log_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `telescopes` ADD CONSTRAINT `telescopes_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cameras` ADD CONSTRAINT `cameras_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `optical_modifiers` ADD CONSTRAINT `optical_modifiers_manufacturer_id_fkey` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
