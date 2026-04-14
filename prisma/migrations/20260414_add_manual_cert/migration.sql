CREATE TABLE "manual_certificate_requests" (
    "id" TEXT NOT NULL,
    "folio" TEXT,
    "client_name" TEXT NOT NULL,
    "piece_description" TEXT NOT NULL,
    "advisor_name" TEXT NOT NULL,
    "notes" TEXT,
    "certificate_title" TEXT,
    "certificate_vinyl_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_photo_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_printed_ready" BOOLEAN NOT NULL DEFAULT false,
    "certificate_delivered_to_advisor" BOOLEAN NOT NULL DEFAULT false,
    "certificate_needs_review" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manual_certificate_requests_pkey" PRIMARY KEY ("id")
);
