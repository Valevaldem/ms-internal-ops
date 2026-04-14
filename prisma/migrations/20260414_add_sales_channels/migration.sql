CREATE TABLE "sales_channels" (
    "sales_channel_id" TEXT NOT NULL,
    "sales_channel_name" TEXT NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_channels_pkey" PRIMARY KEY ("sales_channel_id")
);
CREATE UNIQUE INDEX "sales_channels_sales_channel_name_key" ON "sales_channels"("sales_channel_name");
INSERT INTO "sales_channels" ("sales_channel_id","sales_channel_name","active_status","created_at","updated_at") VALUES
('sc_store','Store',true,NOW(),NOW()),
('sc_whatsapp','WhatsApp',true,NOW(),NOW()),
('sc_instagram','Instagram',true,NOW(),NOW()),
('sc_facebook','Facebook',true,NOW(),NOW()),
('sc_tiktok','TikTok',true,NOW(),NOW()),
('sc_form','Form',true,NOW(),NOW());
