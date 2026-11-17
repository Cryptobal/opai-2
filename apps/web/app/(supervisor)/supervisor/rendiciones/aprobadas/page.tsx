import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Rendiciones aprobadas" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaMisRendiciones portal="supervisor" pestana="aprobadas" searchParams={searchParams} />;
}