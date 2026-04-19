import { redirect } from "next/navigation";

// La vista de producción se unificó con Órdenes Activas (incluye mosaico, lista, filtros, undo y alerta de certificados).
export default function ProduccionRedirectPage() {
  redirect("/ordenes/activas");
}
