"use client";

import { useState } from "react";
import { updateCertificateAction } from "./actions";
import { Check, Edit2, X } from "lucide-react";

type Stone = {
    id: string;
    lotCode: string;
    stoneName: string;
    weightCt: number;
    pricePerCt: number;
    stoneSubtotal: number;
};

type Member = {
    id: string;
    memberName: string;
    representativeStone: string;
    helperDescription: string | null;
};

export default function CertificateEditForm({
    orderId,
    isCertificatePending,
    certificateTitle,
    certificateMembers,
    quotationStones,
    orderStage
}: {
    orderId: string,
    isCertificatePending: boolean,
    certificateTitle: string | null,
    certificateMembers: Member[],
    quotationStones: Stone[],
    orderStage: string
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await updateCertificateAction(orderId, formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setIsEditing(false);
            }
        } catch (err) {
            setError("Ocurrió un error al actualizar los datos del certificado.");
        } finally {
            setIsPending(false);
        }
    };

    const canEdit = orderStage === "Producción";

    if (!isEditing) {
        return (
            <div className="mt-8 bg-[#F5F2EE]/50 p-4 rounded-lg border border-[#D8D3CC]">
                <div className="flex justify-between items-center border-b border-[#D8D3CC] pb-2 mb-3">
                    <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold flex items-center gap-2">
                        <span>Certificado de Autenticidad</span>
                        {isCertificatePending && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Pendiente de Confirmación
                            </span>
                        )}
                    </h3>
                    {canEdit ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs flex items-center gap-1 text-[#C5B358] hover:text-[#333333] transition-colors"
                        >
                            <Edit2 size={12} /> Editar
                        </button>
                    ) : (
                        <span className="text-xs text-[#8E8D8A] italic flex items-center gap-1">
                            {orderStage !== "Por confirmar diseño final" ? "Bloqueado por etapa" : ""}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                    <div className="text-[#8E8D8A]">Título:</div>
                    <div className="font-medium text-[#333333]">{certificateTitle || 'No especificado'}</div>
                </div>

                {certificateMembers.length > 0 && (
                    <div className="space-y-3">
                        <div className="text-xs font-semibold text-[#8E8D8A] uppercase tracking-wider">Asignación de Piedras:</div>
                        {certificateMembers.map((member, idx) => {
                            const relatedStone = quotationStones.find(s => s.lotCode === member.representativeStone);
                            const stoneLabel = relatedStone ? `${relatedStone.lotCode} - ${relatedStone.stoneName}` : member.representativeStone;
                            return (
                                <div key={idx} className="bg-white p-2.5 rounded border border-[#D8D3CC] text-sm flex flex-col gap-1">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-[#333333]">{member.memberName}</span>
                                        <span className="text-xs text-[#8E8D8A]">{stoneLabel}</span>
                                    </div>
                                    {member.helperDescription && (
                                        <div className="text-xs text-[#8E8D8A] italic bg-[#F5F2EE] p-1.5 rounded mt-1">
                                            Nota identificadora: {member.helperDescription}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 bg-white p-4 rounded-lg border border-[#C5B358] shadow-sm">
            <div className="flex justify-between items-center border-b border-[#F5F2EE] pb-2 mb-3">
                <h3 className="text-sm uppercase tracking-wider text-[#8E8D8A] font-semibold">Editar Certificado</h3>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs flex items-center gap-1 text-[#8E8D8A] hover:text-[#333333] transition-colors"
                    disabled={isPending}
                >
                    <X size={14} /> Cancelar
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200 mb-4">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="flex items-center text-sm text-[#333333] cursor-pointer">
                    <input
                        type="checkbox"
                        name="isCertificatePending"
                        defaultChecked={isCertificatePending}
                        className="mr-2"
                    />
                    Pendiente de Confirmación (El cliente aún no sabe los datos finales)
                </label>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-[#333333] mb-1">Título del Certificado (ej. Apellidos de la Familia)</label>
                    <input
                        type="text"
                        name="certificateTitle"
                        defaultValue={certificateTitle || ""}
                        className="w-full border border-[#D8D3CC] rounded p-2 text-sm focus:outline-none focus:border-[#C5B358]"
                    />
                </div>

                {quotationStones.length > 0 && (
                    <div>
                        <label className="block text-sm text-[#333333] mb-2 font-medium">Asignación de Piedras</label>
                        <div className="space-y-3">
                            {quotationStones.map((stone, i) => {
                                const existingMember = certificateMembers.find(m => m.representativeStone === stone.lotCode);
                                return (
                                    <div key={stone.id} className="bg-[#F5F2EE] p-3 rounded border border-[#D8D3CC] flex flex-col gap-2">
                                        <div className="text-xs font-semibold text-[#8E8D8A]">
                                            Piedra {i + 1}: {stone.lotCode} - {stone.stoneName} ({stone.weightCt}ct)
                                            <input type="hidden" name={`stoneId_${i}`} value={stone.id} />
                                            <input type="hidden" name={`stoneLot_${i}`} value={stone.lotCode} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <input
                                                    type="text"
                                                    name={`member_${i}`}
                                                    defaultValue={existingMember?.memberName || ""}
                                                    placeholder="Nombre del Miembro"
                                                    className="w-full border border-[#D8D3CC] rounded p-1.5 text-sm focus:outline-none focus:border-[#C5B358]"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    name={`helper_${i}`}
                                                    defaultValue={existingMember?.helperDescription || ""}
                                                    placeholder="Nota identificadora"
                                                    className="w-full border border-[#D8D3CC] rounded p-1.5 text-sm focus:outline-none focus:border-[#C5B358]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F5F2EE] flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-[#333333] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5"
                >
                    <Check size={14} /> {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}
