import { MapPin, Plus } from "lucide-react";

import { Badge, Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ESTADO_INSTALACION, estadoDe } from "@/app/_components/maestros/estados";
import type { SearchParams } from "@/lib/parametros";

import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Instalaciones de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tab Instalaciones de una cuenta: nombre, comuna y estado; "Nueva instalación" con la cuenta elegida. */
export default function InstalacionesCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="instalaciones">
      {(c) => {
        const nueva = (
          <EnlaceBoton href={`/instalaciones/nueva?cuenta=${c.id}`} icono={Plus}>
            Nueva instalación
          </EnlaceBoton>
        );
        if (!c.instalaciones.length)
          return <Empty titulo={`${c.nombre} aún no tiene instalaciones`} accion={nueva} />;
        return (
          <div className="flex flex-col gap-3">
            <div className="self-end">{nueva}</div>
            <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
              {c.instalaciones.map((i) => {
                const e = estadoDe(ESTADO_INSTALACION, i.estado);
                return (
                  <FilaSeleccionable
                    key={i.id}
                    href={`/instalaciones/${i.id}`}
                    Link={LinkNext}
                    inicio={
                      <span className="flex size-9 items-center justify-center rounded-sm bg-fill text-fg-muted">
                        <MapPin className="size-4" aria-hidden />
                      </span>
                    }
                    titulo={i.nombre}
                    secundario={i.comuna ?? "Sin comuna"}
                    fin={<Badge tono={e.tono}>{e.etiqueta}</Badge>}
                  />
                );
              })}
            </div>
          </div>
        );
      }}
    </PaginaCuenta>
  );
}
