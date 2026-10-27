import { Plus } from "lucide-react";

import { Empty } from "@opai/ds";

import { Buscador } from "@/app/_components/maestros/buscador";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { Parametros, SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type {
  Cargo,
  FuncionPuestoOpcion,
  InstalacionDetalle,
  PatronTurnoOpcion,
} from "@/lib/tipos-maestros";

import { ChipsPuestosDiferido } from "../../_componentes/chips-puestos-diferido";
import { HojaPuesto } from "../../_componentes/diferidas";
import { FilasPuesto, TablaPuestos } from "../../_componentes/lista-puestos";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import { conteosPuestos, filtrarPuestos, subtituloPuestos } from "../../_componentes/puestos-filtro";

export const metadata = { title: "Puestos de la instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

async function Puestos({ i, p }: { i: InstalacionDetalle; p: Parametros }) {
  const [rc, rf, rp] = await Promise.all([
    ejecutarComoUsuario<Cargo[]>("erp", "core.cargos.list", {}),
    ejecutarComoUsuario<FuncionPuestoOpcion[]>("erp", "core.funciones.list", {}),
    ejecutarComoUsuario<PatronTurnoOpcion[]>("erp", "core.patrones.list", {}),
  ]);
  const cargos = rc.ok ? rc.data.filter((c) => c.activo) : [];
  const funciones = rf.ok ? rf.data : [];
  const patrones = rp.ok ? rp.data : [];
  const subtitulo = [i.nombre, i.cuenta].filter(Boolean).join(" · ");
  const nuevo = (
    <EnlaceBotonHoja href="?puesto=nuevo" icono={Plus}>
      Nuevo puesto
    </EnlaceBotonHoja>
  );
  const hoja = (
    <HojaPuesto
      instalacionId={i.id}
      subtitulo={subtitulo}
      puestos={i.puestos}
      cargos={cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
      funciones={funciones}
      patrones={patrones}
      catalogosError={!rf.ok || !rp.ok}
    />
  );
  if (i.puestos.length === 0) {
    return (
      <>
        <Empty
          titulo="Sin puestos de servicio"
          descripcion="Cada puesto es una posición: define su función, patrón de turno y horario."
          accion={nuevo}
        />
        {hoja}
      </>
    );
  }
  const conteos = conteosPuestos(i.puestos);
  const filtradas = filtrarPuestos(i.puestos, p.q, p.filtro);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="t-body-sm text-fg-muted">{subtituloPuestos(conteos)}</p>
        <div className="flex-none">{nuevo}</div>
      </div>
      <div className="flex flex-col gap-3">
        <Buscador placeholder="Nombre del puesto" />
        <ChipsPuestosDiferido conteos={conteos} />
      </div>
      {filtradas.length === 0 ? (
        <Empty
          titulo="Sin resultados"
          descripcion="Ningún puesto coincide con la búsqueda o el filtro."
        />
      ) : (
        <>
          <FilasPuesto puestos={filtradas} />
          <TablaPuestos puestos={filtradas} />
        </>
      )}
      {hoja}
    </div>
  );
}

/** Tab Puestos (Brief 11): tabla desde tablet y filas en teléfono, con buscador, chips y cobertura PPC. */
export default function PuestosInstalacion(props: Props) {
  return (
    <PaginaInstalacion {...props} tab="puestos">
      {(i, p) => <Puestos i={i} p={p} />}
    </PaginaInstalacion>
  );
}
