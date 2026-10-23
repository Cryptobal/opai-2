import { ActividadFicha } from "@/app/_components/maestros/actividad-ficha";
import type { SearchParams } from "@/lib/parametros";

import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Actividad de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function ActividadCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="actividad">
      {(c, p) => (
        <ActividadFicha
          entidad={{ tipo: "cuenta", id: c.id }}
          actor={p["actor"]}
          base={`/cuentas/${c.id}/actividad`}
        />
      )}
    </PaginaCuenta>
  );
}
