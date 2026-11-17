import { PaginaTodasRendiciones } from "@/app/_components/rendiciones/pagina-todas";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Todas las rendiciones" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaTodasRendiciones searchParams={searchParams} />;
}