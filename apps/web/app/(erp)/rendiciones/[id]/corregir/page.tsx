import { PaginaCorregir } from "@/app/_components/rendiciones/pagina-corregir";

export const metadata = { title: "Corregir rendición" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PaginaCorregir portal="erp" params={params} />;
}
