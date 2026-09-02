CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "website_url" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telescopes" (
    "id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "optical_design" VARCHAR(255) NOT NULL,
    "aperture_mm" DECIMAL(9,3) NOT NULL,
    "native_focal_length_mm" DECIMAL(10,3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_url" VARCHAR(2048) NOT NULL,
    "verified_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telescopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "sensor_name" VARCHAR(255) NOT NULL,
    "sensor_width_mm" DECIMAL(9,4) NOT NULL,
    "sensor_height_mm" DECIMAL(9,4) NOT NULL,
    "pixel_size_um" DECIMAL(7,3) NOT NULL,
    "resolution_width_px" INTEGER NOT NULL,
    "resolution_height_px" INTEGER NOT NULL,
    "sensor_type" VARCHAR(100) NOT NULL,
    "colour_mode" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_url" VARCHAR(2048) NOT NULL,
    "verified_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "optical_modifiers" (
    "id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "modifier_type" VARCHAR(100) NOT NULL,
    "multiplier" DECIMAL(7,4) NOT NULL,
    "compatible_notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_url" VARCHAR(2048) NOT NULL,
    "verified_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "optical_modifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "astronomical_targets" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(191) NOT NULL,
    "catalogue_name" VARCHAR(255) NOT NULL,
    "common_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "angular_width_deg" DECIMAL(10,6) NOT NULL,
    "angular_height_deg" DECIMAL(10,6) NOT NULL,
    "default_rotation_deg" DECIMAL(7,3) NOT NULL,
    "asset_path" VARCHAR(2048),
    "asset_credit" VARCHAR(1024),
    "asset_license_url" VARCHAR(2048),
    "framing_note" VARCHAR(1024),
    "source_url" VARCHAR(2048) NOT NULL,
    "verified_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "astronomical_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalogue_change_log" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "source_url" VARCHAR(2048) NOT NULL,
    "changed_by" VARCHAR(191) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalogue_change_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manufacturers_slug_key" ON "manufacturers"("slug");
CREATE UNIQUE INDEX "telescopes_slug_key" ON "telescopes"("slug");
CREATE UNIQUE INDEX "telescopes_manufacturer_id_model_key" ON "telescopes"("manufacturer_id", "model");
CREATE INDEX "telescopes_active_idx" ON "telescopes"("active");
CREATE UNIQUE INDEX "cameras_slug_key" ON "cameras"("slug");
CREATE UNIQUE INDEX "cameras_manufacturer_id_model_key" ON "cameras"("manufacturer_id", "model");
CREATE INDEX "cameras_active_idx" ON "cameras"("active");
CREATE UNIQUE INDEX "optical_modifiers_slug_key" ON "optical_modifiers"("slug");
CREATE UNIQUE INDEX "optical_modifiers_manufacturer_id_model_key" ON "optical_modifiers"("manufacturer_id", "model");
CREATE INDEX "optical_modifiers_active_idx" ON "optical_modifiers"("active");
CREATE UNIQUE INDEX "astronomical_targets_slug_key" ON "astronomical_targets"("slug");
CREATE UNIQUE INDEX "astronomical_targets_catalogue_name_key" ON "astronomical_targets"("catalogue_name");
CREATE INDEX "astronomical_targets_category_idx" ON "astronomical_targets"("category");
CREATE INDEX "catalogue_change_log_entity_type_entity_id_idx" ON "catalogue_change_log"("entity_type", "entity_id");
CREATE INDEX "catalogue_change_log_created_at_idx" ON "catalogue_change_log"("created_at");

ALTER TABLE "telescopes" ADD CONSTRAINT "telescopes_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "optical_modifiers" ADD CONSTRAINT "optical_modifiers_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
