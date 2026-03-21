"use client";

export default function SalesChannelFilter({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="salesChannel"
      defaultValue={defaultValue}
      onChange={(e) => e.target.form?.submit()}
      className="w-40 border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white"
    >
      <option value="">Canal de Venta</option>
      <option value="Store">Tienda</option>
      <option value="WhatsApp">WhatsApp</option>
      <option value="Instagram">Instagram</option>
      <option value="Facebook">Facebook</option>
      <option value="TikTok">TikTok</option>
      <option value="Form">Formulario</option>
    </select>
  );
}
