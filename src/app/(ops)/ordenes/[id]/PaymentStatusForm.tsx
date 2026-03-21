"use client";

export default function PaymentStatusForm({ orderId, currentStatus, updateAction }: { orderId: string, currentStatus: string, updateAction: (formData: FormData) => void }) {
  return (
    <form action={updateAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={orderId} />
      <select
        name="paymentStatus"
        defaultValue={currentStatus}
        className="text-sm bg-white border border-[#D8D3CC] rounded px-2 py-1 text-[#333333] focus:outline-none focus:border-[#C5B358]"
        onChange={(e) => e.target.form?.requestSubmit()}
      >
        <option value="Parcial">Parcial</option>
        <option value="Liquidado">Liquidado</option>
      </select>
    </form>
  );
}
