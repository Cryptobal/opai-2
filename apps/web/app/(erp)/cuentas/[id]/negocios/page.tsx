import type { SearchParams } from "@/lib/parametros";

import { NegociosDeEntidad } from "../../../negocios/_componentes/negocios-de-entidad";
import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Negocios de la cuenta" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Negocios de una cuenta: sus oportunidades de venta (ADR-041). */
export default function NegociosCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="negocios">
      {(c) => <NegociosDeEntidad cuentaId={c.id} />}
    </PaginaCuenta>
  );
}
