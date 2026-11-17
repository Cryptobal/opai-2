import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Mis rendiciones" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaMisRendiciones portal="erp" pestana="borradores" searchParams={searchParams} />;
}
