import type { SearchParams } from "@/lib/parametros";

import { PaginaCompras } from "../_componentes/pagina-compras";

export const metadata = { title: "Documento de compras" };

/** Un documento de compras: el libro sigue a la izquierda y el detalle se abre a la derecha (CAR-256). */
export default function CompraDetallePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  return <PaginaCompras params={params} searchParams={searchParams} />;
}
