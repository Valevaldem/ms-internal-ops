"use client";

import { useTransition } from "react";
import { toggleCertificateStatusAction, markReviewCompletedAction } from "./actions";
import { Check } from "lucide-react";

export default function CertificateActionButtons({
    orderId,
    vinylReady,
    printedReady,
    photoReady,
    needsReview
}: {
    orderId: string,
    vinylReady: boolean,
    printedReady: boolean,
    photoReady: boolean,
    needsReview: boolean
}) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = (field: "certificateVinylReady" | "certificatePrintedReady" | "certificatePhotoReady") => {
        startTransition(async () => {
             await toggleCertificateStatusAction(orderId, field);
        });
    };

    const handleMarkReviewed = () => {
        startTransition(async () => {
             await markReviewCompletedAction(orderId);
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center text-sm cursor-pointer gap-2 opacity-80 hover:opacity-100 transition-opacity w-max">
                <input
                    type="checkbox"
                    checked={vinylReady}
                    onChange={() => handleToggle("certificateVinylReady")}
                    disabled={isPending}
                    className="accent-[#C5B358]"
                />
                <span className={vinylReady ? "text-green-700 line-through" : "text-[#333333]"}>Vinil / Título Preparado</span>
            </label>
            <label className="flex items-center text-sm cursor-pointer gap-2 opacity-80 hover:opacity-100 transition-opacity w-max">
                <input
                    type="checkbox"
                    checked={printedReady}
                    onChange={() => handleToggle("certificatePrintedReady")}
                    disabled={isPending}
                    className="accent-[#C5B358]"
                />
                <span className={printedReady ? "text-green-700 line-through" : "text-[#333333]"}>Información Impresa Preparada</span>
            </label>
            <label className="flex items-center text-sm cursor-pointer gap-2 opacity-80 hover:opacity-100 transition-opacity w-max">
                <input
                    type="checkbox"
                    checked={photoReady}
                    onChange={() => handleToggle("certificatePhotoReady")}
                    disabled={isPending}
                    className="accent-[#C5B358]"
                />
                <span className={photoReady ? "text-green-700 line-through" : "text-[#333333]"}>Foto de Pieza Agregada</span>
            </label>

            {needsReview && (
                <button
                    onClick={handleMarkReviewed}
                    disabled={isPending}
                    className="mt-2 text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 rounded px-2 py-1 flex items-center gap-1 hover:bg-yellow-200 transition-colors w-max"
                >
                    <Check size={12} /> Marcar Revisado
                </button>
            )}
        </div>
    );
}
