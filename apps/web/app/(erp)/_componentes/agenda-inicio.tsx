import { enAgenda, PERMISOS_CORE } from "@opai/domain";
import { Empty } from "@opai/ds";

import { GruposTareas } from "@/app/_components/actividad/grupos-tareas";
import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { esFalloReal, FalloBloque } from "./fallo-bloque";

const DIAS = 14;

/**
 * «Agenda» del Inicio nuevo (ADR-109, CAR-335 D3): tus tareas que vencen en los próximos 14 días,
 * después de hoy, en días de calendario (vencidas y de hoy van en «Necesita tu atención»). Misma capacidad
 * que «Mis tareas», con más filas para que muchas vencidas no dejen fuera las próximas.
 */
export async function AgendaInicio() {
  const [identidad, r] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { limite: 100 }),
  ]);
  if (!identidad) return null;
  if (!r.ok)
    return esFalloReal(r.error.code) ? <FalloBloque titulo="No pudimos cargar tu agenda" /> : null;
  const ahora = new Date();
  const proximas = r.data.items.filter((t) => enAgenda(t.vencimiento, ahora, DIAS));
  if (!proximas.length)
    return (
      <Empty
        titulo="Nada en los próximos 14 días"
        descripcion="Tus tareas con fecha aparecerán aquí."
        accion={
          <EnlaceBoton href="/tareas" variante="ghost">
            Ver tareas
          </EnlaceBoton>
        }
      />
    );
  const gestiona = puedeDeIdentidad(identidad)(PERMISOS_CORE.actividadesManage);
  return <GruposTareas tareas={proximas} gestiona={gestiona} solo={["semana", "despues"]} />;
}
