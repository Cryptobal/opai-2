import type { SearchParams } from "@/lib/parametros";

import { PaginaCuenta } from "../_componentes/pagina-cuenta";
import { ResumenCuenta } from "../_componentes/resumen-cuenta";

export const metadata = { title: "Cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Cuenta · Resumen dentro de la vista dividida (01); en teléfono, el detalle con "Atrás" (04). */
export default function Cuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="resumen">
      {(c) => <ResumenCuenta c={c} />}
    </PaginaCuenta>
  );
}
