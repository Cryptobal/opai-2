import { Plus } from "lucide-react";

import { Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { activosPrimero, BadgePuesto } from "@/app/_components/maestros/badge-puesto";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type {
  Cargo,
  FuncionPuestoOpcion,
  InstalacionDetalle,
  PatronTurnoOpcion,
} from "@/lib/tipos-maestros";

import { HojaPuesto } from "../../_componentes/diferidas";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Puestos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

type PuestoFila = InstalacionDetalle["puestos"][number];

/**
 * Trozos de una línea que bajan de renglón en vez de cortarse (CAR-8: a 375 px el horario y el
 * patrón se truncaban). Cada trozo es corto y se mantiene entero.
 */
function Trozos({ partes, className }: { partes: (string | null)[]; className: string }) {
  return (
    <span className={`flex flex-wrap gap-x-1 whitespace-normal ${className}`} data-linea-puesto>
      {partes.filter(Boolean).map((t, i, arr) => (
        <span key={i} className="whitespace-nowrap">
          {t}
          {i < arr.length - 1 ? " ·" : ""}
        </span>
      ))}
    </span>
  );
}

/** Patrón (claro, CAR-8) y función. */
const secundario = (p: PuestoFila) => (
  <Trozos
    partes={[p.patron ?? "Sin patrón", p.funcion ?? "Sin función"]}
    className="text-fg-muted"
  />
);

/** Horario por tramos y horas semanales, en el tono terciario del DS. */
const terciario = (p: PuestoFila) => (
  <Trozos
    partes={[
      p.horario,
      p.horarioNoche,
      p.horasSemanales != null ? `${p.horasSemanales} h/sem` : null,
    ]}
    className="t-caption"
  />
);

async function Puestos({ i }: { i: InstalacionDetalle }) {
  const [rc, rf, rp] = await Promise.all([
    ejecutarComoUsuario<Cargo[]>("erp", "core.cargos.list", {}),
    ejecutarComoUsuario<FuncionPuestoOpcion[]>("erp", "core.funciones.list", {}),
    ejecutarComoUsuario<PatronTurnoOpcion[]>("erp", "core.patrones.list", {}),
  ]);
  const cargos = rc.ok ? rc.data.filter((c) => c.activo) : [];
  const funciones = rf.ok ? rf.data : [];
  const patrones = rp.ok ? rp.data : [];
  const nuevo = (
    <EnlaceBotonHoja href="?puesto=nuevo" icono={Plus}>
      Nuevo puesto
    </EnlaceBotonHoja>
  );
  return (
    <>
      {i.puestos.length === 0 ? (
        <Empty
          titulo="Sin puestos de servicio"
          descripcion="Cada puesto es una posición: define su función, patrón de turno y horario."
          accion={nuevo}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="self-end">{nuevo}</div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
            {activosPrimero(i.puestos).map((p) => (
              <FilaSeleccionable
                key={p.id}
                href={`?puesto=${p.id}`}
                Link={LinkNext}
                titulo={p.nombre}
                secundario={secundario(p)}
                terciario={terciario(p)}
                fin={<BadgePuesto estado={p.estado} cobertura={p.cobertura} />}
              />
            ))}
          </div>
        </div>
      )}
      <HojaPuesto
        instalacionId={i.id}
        puestos={i.puestos}
        cargos={cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
        funciones={funciones}
        patrones={patrones}
      />
    </>
  );
}

/** Tab Puestos (Brief 11): una fila por posición con función, patrón, horario y cobertura PPC. */
export default function PuestosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="puestos">
      {(i) => <Puestos i={i} />}
    </PaginaInstalacion>
  );
}
