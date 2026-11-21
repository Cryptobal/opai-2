import { SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { agruparModulosPorArea, TEXTO_ESTADO } from "./modulos-vista";
import type { DetalleTenant } from "./tipos";

type Props = { tenantId: string; modulos: DetalleTenant["modulos"] };

/** Tarjeta de módulos y complementos en el resumen de la empresa (CAR-742). */
export function ResumenModulosCard({ tenantId, modulos }: Props) {
  return (
    <SeccionTarjeta
      titulo="Módulos"
      sinRelleno
      accion={
        <EnlaceBoton href={`/platform/tenants/${tenantId}/modulos`} variante="ghost">
          Gestionar
        </EnlaceBoton>
      }
    >
      <ul className="flex flex-col gap-3 px-4 pb-2">
        <li className="flex justify-between gap-3 text-sm">
          <span className="text-fg">Núcleo</span>
          <span className="text-muted-fg">Siempre activo</span>
        </li>
        {agruparModulosPorArea(modulos).map((g) => (
          <li key={g.area}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-fg">{g.titulo}</p>
            <ul className="flex flex-col gap-1">
              {g.filas.map((x) => (
                <li
                  key={x.id}
                  className={`flex justify-between gap-3 text-sm ${x.complemento ? "pl-3" : ""}`}
                >
                  <span className="text-fg">
                    {x.nombre}
                    {x.complemento && x.etiquetaCobro ? (
                      <span className="text-muted-fg"> · {x.etiquetaCobro}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-muted-fg">
                    {x.estado ? (TEXTO_ESTADO[x.estado] ?? x.estado) : "No contratado"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}