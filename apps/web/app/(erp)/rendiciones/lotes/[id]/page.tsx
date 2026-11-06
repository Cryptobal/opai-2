import { PaginaLote } from "@/app/_components/rendiciones/lotes/pagina";

export const metadata = { title: "Lote de pago" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PaginaLote params={params} />;
}
