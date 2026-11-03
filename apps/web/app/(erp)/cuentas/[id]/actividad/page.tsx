import { PanelActividad } from "@/app/_components/actividad/panel-actividad";
import { itemsDeAuditoria } from "@/app/_components/actividad/sistema";
import type { SearchParams } from "@/lib/parametros";

import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Actividad de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Cuenta · Actividad (CAR-162): lo registrado a mano más la auditoría de la ficha. */
export default function ActividadCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="actividad">
      {async (c, p) => (
        <PanelActividad
          ficha={{
            tipo: "cuenta",
            id: c.id,
            nombre: c.nombre,
            relacionadas: c.contactos
              .filter((x) => x.esPrincipal)
              .map((x) => ({ tipo: "contacto" as const, id: x.id, nombre: x.nombre })),
          }}
          tipo={p["tipo"]}
          base={`/cuentas/${c.id}/actividad`}
          sistema={await itemsDeAuditoria({ tipo: "cuenta", id: c.id })}
        />
      )}
    </PaginaCuenta>
  );
}
