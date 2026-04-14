import prisma from "@/lib/prisma"

export default async function SalesChannelFilter({ defaultValue }: { defaultValue: string }) {
  const channels = await prisma.salesChannel.findMany({
    where: { activeStatus: true },
    orderBy: { name: 'asc' }
  })

  // Fallback si no hay canales en DB aún
  const channelList = channels.length > 0
    ? channels
    : [
        { id: 'Store', name: 'Store' },
        { id: 'WhatsApp', name: 'WhatsApp' },
        { id: 'Instagram', name: 'Instagram' },
        { id: 'Facebook', name: 'Facebook' },
        { id: 'TikTok', name: 'TikTok' },
        { id: 'Form', name: 'Form' },
      ]

  return (
    <select
      name="salesChannel"
      defaultValue={defaultValue}
      className="w-40 border border-[#D8D3CC] rounded-md p-2 text-sm focus:outline-none focus:border-[#C5B358] bg-white"
    >
      <option value="">Canal de Venta</option>
      {channelList.map(c => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  )
}
