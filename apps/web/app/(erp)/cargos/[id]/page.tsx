import type { SearchParams } from "@/lib/parametros";

import { PaginaCargo } from "../_componentes/pagina-cargo";

export const metadata = { title: "Cargo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Cargo dentro de la vista dividida (14); en teléfono, el detalle con «Atrás». */
export default function CargoDetalle(props: Props) {
  return <PaginaCargo {...props} />;
}
