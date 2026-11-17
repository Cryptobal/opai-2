import { PaginaLotes } from "@/app/_components/rendiciones/lotes/pagina";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Lotes de pago" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaLotes searchParams={searchParams} />;
}
