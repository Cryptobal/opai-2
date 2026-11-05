import { PaginaDetalle } from "@/app/_components/rendiciones/pagina-detalle";

export const metadata = { title: "Rendición" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PaginaDetalle portal="erp" params={params} />;
}
