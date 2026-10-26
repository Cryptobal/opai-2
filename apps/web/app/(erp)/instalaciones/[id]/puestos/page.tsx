import { Plus } from "lucide-react";

import { Badge, Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { COBERTURA_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
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

/** Línea secundaria de cada posición: función, patrón y horario, sin apretujarse (CAR-8). */
function secundario(p: InstalacionDetalle["puestos"][number]): string {
  const horario = p.horarioNoche ? `${p.horario} / ${p.horarioNoche}` : p.horario;
  const horas = p.horasSemanales != null ? ` · ${p.horasSemanales} h/sem` : "";
  return `${p.funcion ?? "Sin función"} · ${p.patron ?? "Sin patrón"} · ${horario}${horas}`;
}

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
            {i.puestos.map((p) => {
              const c = estadoDe(COBERTURA_PUESTO, p.cobertura);
              return (
                <FilaSeleccionable
                  key={p.id}
                  href={`?puesto=${p.id}`}
                  Link={LinkNext}
                  titulo={p.nombre}
                  secundario={secundario(p)}
                  fin={<Badge tono={c.tono}>{c.etiqueta}</Badge>}
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
