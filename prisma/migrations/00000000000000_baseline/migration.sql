-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "sales_associate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sales_associates" (
    "associate_id" TEXT NOT NULL,
    "associate_name" TEXT NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "applies_ms_adjustment" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sales_associates_pkey" PRIMARY KEY ("associate_id")
);

-- CreateTable
CREATE TABLE "models" (
    "model_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "piece_type" TEXT NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("model_id")
);

-- CreateTable
CREATE TABLE "piece_types" (
    "piece_type_id" TEXT NOT NULL,
    "piece_type_name" TEXT NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_types_pkey" PRIMARY KEY ("piece_type_id")
);

-- CreateTable
CREATE TABLE "stone_lots" (
    "lot_code" TEXT NOT NULL,
    "stone_name" TEXT NOT NULL,
    "cut" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "price_per_ct" DOUBLE PRECISION NOT NULL,
    "pricing_mode" TEXT NOT NULL DEFAULT 'CT',
    "active_status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stone_lots_pkey" PRIMARY KEY ("lot_code")
);

-- CreateTable
CREATE TABLE "quotations" (
    "quotation_id" TEXT NOT NULL,
    "folio" TEXT,
    "quotation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_name_or_username" TEXT NOT NULL,
    "phone_number" TEXT,
    "sales_channel" TEXT NOT NULL,
    "sales_associate_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Standard',
    "piece_type" TEXT NOT NULL,
    "model_name" TEXT,
    "model_base_price" DOUBLE PRECISION,
    "manual_piece_description" TEXT,
    "notes" TEXT,
    "production_timing" TEXT,
    "total_stones_price" DOUBLE PRECISION,
    "subtotal_before_adjustments" DOUBLE PRECISION,
    "ms_internal_adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin_protection_enabled" BOOLEAN NOT NULL DEFAULT false,
    "margin_protection_percent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "margin_protection_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_percent" DOUBLE PRECISION,
    "final_client_price" DOUBLE PRECISION NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "days_remaining" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendiente de respuesta',
    "followup_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "parent_quotation_id" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("quotation_id")
);

-- CreateTable
CREATE TABLE "quotation_stones" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "lot_code" TEXT NOT NULL,
    "stone_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight_ct" DOUBLE PRECISION NOT NULL,
    "price_per_ct" DOUBLE PRECISION NOT NULL,
    "pricing_mode" TEXT NOT NULL DEFAULT 'CT',
    "stone_subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quotation_stones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "reference_image_url" TEXT,
    "pos_ticket_number" TEXT,
    "delivery_method" TEXT NOT NULL,
    "certificate_title" TEXT,
    "family_last_name_or_title" TEXT,
    "certificate_status" TEXT NOT NULL DEFAULT 'Not Started',
    "certificate_vinyl_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_photo_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_printed_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_delivered_to_advisor" BOOLEAN NOT NULL DEFAULT false,
    "certificate_needs_review" BOOLEAN NOT NULL DEFAULT false,
    "order_notes" TEXT,
    "certificate_notes" TEXT,
    "is_certificate_pending" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'Por confirmar diseño final',
    "production_start_date" TIMESTAMP(3),
    "estimated_production_end" TIMESTAMP(3),
    "production_days_elapsed" INTEGER NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'Parcial',
    "production_timing" TEXT,
    "is_priority" BOOLEAN NOT NULL DEFAULT false,
    "shipping_carrier" TEXT,
    "tracking_number" TEXT,
    "shipping_date" TIMESTAMP(3),
    "estimated_delivery_date" TIMESTAMP(3),
    "delivered_confirmation" TIMESTAMP(3),
    "pickup_ready_date" TIMESTAMP(3),
    "pickup_completed_date" TIMESTAMP(3),
    "post_sale_5_days_date" TIMESTAMP(3),
    "post_sale_1_month_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "certificate_members" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "member_name" TEXT NOT NULL,
    "representative_stone" TEXT NOT NULL,
    "helper_description" TEXT,

    CONSTRAINT "certificate_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_stage_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "piece_types_piece_type_name_key" ON "piece_types"("piece_type_name");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_folio_key" ON "quotations"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quotation_id_key" ON "orders"("quotation_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sales_associate_id_fkey" FOREIGN KEY ("sales_associate_id") REFERENCES "sales_associates"("associate_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sales_associate_id_fkey" FOREIGN KEY ("sales_associate_id") REFERENCES "sales_associates"("associate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_parent_quotation_id_fkey" FOREIGN KEY ("parent_quotation_id") REFERENCES "quotations"("quotation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_stones" ADD CONSTRAINT "quotation_stones_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("quotation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("quotation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_members" ADD CONSTRAINT "certificate_members_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stage_history" ADD CONSTRAINT "order_stage_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;
