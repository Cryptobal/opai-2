import { Plus } from "lucide-react";

import { Badge, Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ESTADO_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Cargo, InstalacionDetalle } from "@/lib/tipos-maestros";

import { HojaPuesto } from "../../_componentes/diferidas";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Puestos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

async function Puestos({ i }: { i: InstalacionDetalle }) {
  const r = await ejecutarComoUsuario<Cargo[]>("erp", "core.cargos.list", {});
  const cargos = r.ok ? r.data.filter((c) => c.activo) : [];
  const nombreCargo = new Map(cargos.map((c) => [c.id, c.nombre]));
  const nuevo = (
    <EnlaceBoton href="?puesto=nuevo" icono={Plus}>
      Nuevo puesto
    </EnlaceBoton>
  );
  return (
    <>
      {i.puestos.length === 0 ? (
        <Empty
          titulo="Sin puestos de servicio"
          descripcion="Define cargo, patrón, horario y dotación de cada puesto."
          accion={nuevo}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="self-end">{nuevo}</div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
            {i.puestos.map((p) => {
              const e = estadoDe(ESTADO_PUESTO, p.estado);
              return (
                <FilaSeleccionable
                  key={p.id}
                  href={`?puesto=${p.id}`}
                  Link={LinkNext}
                  titulo={p.nombre}
                  secundario={`${nombreCargo.get(p.cargoId) ?? "Cargo"} · ${p.diasTrabajo}×${p.diasDescanso} · ${p.horario}`}
                  fin={
                    <>
                      <Badge tono={e.tono}>{e.etiqueta}</Badge>
                      <span className="t-caption t-numeric">Dotación {p.dotacion}</span>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      )}
      <HojaPuesto
        instalacionId={i.id}
        puestos={i.puestos}
        cargos={cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
      />
    </>
  );
}

/** Tab Puestos (07): puesto, cargo, patrón, horario, dotación y estado; nuevo y editar en Sheet. */
export default function PuestosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="puestos">
      {(i) => <Puestos i={i} />}
    </PaginaInstalacion>
  );
}
