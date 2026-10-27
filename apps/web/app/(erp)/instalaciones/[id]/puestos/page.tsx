import { Plus } from "lucide-react";

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
import { ListaPuestos } from "../../_componentes/lista-puestos";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";
import {
  conteosPuestos,
  filtrarPuestos,
  subtituloPuestos,
} from "../../_componentes/puestos-filtro";

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
      catalogosError={!rc.ok || !rf.ok || !rp.ok}
    />
  );
  const conteos = conteosPuestos(i.puestos);
  const filtradas = filtrarPuestos(i.puestos, p);
  return (
    <div className="flex flex-col gap-4">
      {i.puestos.length > 0 ? (
        <div className="flex items-start justify-between gap-4">
          <p className="t-body-sm text-fg-muted">{subtituloPuestos(conteos)}</p>
          <div className="flex-none">{nuevo}</div>
        </div>
      ) : null}
      <ListaPuestos
        state="ready"
        puestos={filtradas}
        buscador={<Buscador placeholder="Nombre del puesto" param="pq" />}
        filtros={<ChipsPuestosDiferido puestos={i.puestos} />}
        accionVacio={i.puestos.length === 0 ? nuevo : null}
      />
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
