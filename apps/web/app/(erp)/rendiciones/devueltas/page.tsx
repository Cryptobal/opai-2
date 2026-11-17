import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Rendiciones devueltas" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaMisRendiciones portal="erp" pestana="devueltas" searchParams={searchParams} />;
}
