import { grupoDeTarea, PERMISOS_CORE } from "@opai/domain";
import { SeccionTarjeta } from "@opai/ds";

import { GruposTareas } from "@/app/_components/actividad/grupos-tareas";
import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { esFalloReal, FalloBloque } from "./fallo-bloque";

/**
 * «Mis tareas de hoy» en Inicio (CAR-162): vencidas y de hoy; sin tareas o sin permiso, no aparece. La
 * Bandeja la monta con otro título y más filas (CAR-160): las tareas asignadas, incluidas las de los
 * pasos de seguimiento, salen ahí como cualquier tarea, sin otra cola.
 */
export async function TareasInicio({ titulo = "Mis tareas", max = 5 }: { titulo?: string; max?: number } = {}) {
  const [identidad, r] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { limite: 50 }),
  ]);
  if (!identidad) return null;
  if (!r.ok)
    return esFalloReal(r.error.code) ? <FalloBloque titulo="No pudimos cargar tus tareas" /> : null;
  const gestiona = puedeDeIdentidad(identidad)(PERMISOS_CORE.actividadesManage);
  const ahora = new Date();
  const tareas = r.data.items
    .filter((t) => ["vencidas", "hoy"].includes(grupoDeTarea(t.vencimiento, ahora)))
    .slice(0, max);
  if (!tareas.length) return null;
  return (
    <SeccionTarjeta
      titulo={titulo}
      accion={
        <EnlaceBoton href="/tareas" variante="ghost">
          Ver todas
        </EnlaceBoton>
      }
    >
      <GruposTareas tareas={tareas} gestiona={gestiona} solo={["vencidas", "hoy"]} />
    </SeccionTarjeta>
  );
}
