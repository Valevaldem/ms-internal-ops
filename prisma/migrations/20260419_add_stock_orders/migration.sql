-- Tanda 2a: Proveedores + Pedidos de Stock

-- Suppliers catalog
CREATE TABLE "suppliers" (
  "supplier_id" TEXT NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "active_status" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

CREATE UNIQUE INDEX "suppliers_supplier_name_key" ON "suppliers"("supplier_name");

-- Stock orders (pedidos de stock, flujo Fernanda)
CREATE TABLE "stock_orders" (
  "stock_order_id" TEXT NOT NULL,
  "folio" TEXT,
  "piece_name" TEXT NOT NULL,
  "supplier_id" TEXT,
  "piece_type" TEXT NOT NULL,
  "model_name" TEXT,
  "model_base_price" DOUBLE PRECISION,
  "production_timing" TEXT,
  "custom_production_days" INTEGER,
  "metal_weight_grams" DOUBLE PRECISION,
  "total_stones_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "raw_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "manual_final_price" DOUBLE PRECISION,
  "notes" TEXT,
  "certificate_notes" TEXT,
  "certificate_title" TEXT,
  "family_last_name_or_title" TEXT,
  "certificate_status" TEXT NOT NULL DEFAULT 'Not Started',
  "certificate_vinyl_ready" BOOLEAN NOT NULL DEFAULT false,
  "certificate_photo_ready" BOOLEAN NOT NULL DEFAULT false,
  "certificate_printed_ready" BOOLEAN NOT NULL DEFAULT false,
  "certificate_delivered_to_advisor" BOOLEAN NOT NULL DEFAULT false,
  "certificate_needs_review" BOOLEAN NOT NULL DEFAULT false,
  "is_certificate_pending" BOOLEAN NOT NULL DEFAULT false,
  "photos_ready" BOOLEAN NOT NULL DEFAULT false,
  "display_ready" BOOLEAN NOT NULL DEFAULT false,
  "stage" TEXT NOT NULL DEFAULT 'En diseño',
  "production_start_date" TIMESTAMP(3),
  "estimated_production_end" TIMESTAMP(3),
  "is_draft" BOOLEAN NOT NULL DEFAULT false,
  "is_priority" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_orders_pkey" PRIMARY KEY ("stock_order_id")
);

CREATE UNIQUE INDEX "stock_orders_folio_key" ON "stock_orders"("folio");

ALTER TABLE "stock_orders"
  ADD CONSTRAINT "stock_orders_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Stock order stones
CREATE TABLE "stock_order_stones" (
  "id" TEXT NOT NULL,
  "stock_order_id" TEXT NOT NULL,
  "consecutive" INTEGER NOT NULL,
  "lot_code" TEXT,
  "stone_name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "weight_ct" DOUBLE PRECISION NOT NULL,
  "price_per_ct" DOUBLE PRECISION NOT NULL,
  "pricing_mode" TEXT NOT NULL DEFAULT 'CT',
  "stone_subtotal" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "is_custom" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "stock_order_stones_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stock_order_stones"
  ADD CONSTRAINT "stock_order_stones_stock_order_id_fkey"
  FOREIGN KEY ("stock_order_id") REFERENCES "stock_orders"("stock_order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stock order stage history
CREATE TABLE "stock_order_stage_history" (
  "id" TEXT NOT NULL,
  "stock_order_id" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_order_stage_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stock_order_stage_history"
  ADD CONSTRAINT "stock_order_stage_history_stock_order_id_fkey"
  FOREIGN KEY ("stock_order_id") REFERENCES "stock_orders"("stock_order_id") ON DELETE CASCADE ON UPDATE CASCADE;
