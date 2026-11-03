import { grupoDeTarea, PERMISOS_CORE } from "@opai/domain";
import { SeccionTarjeta } from "@opai/ds";

import { GruposTareas } from "@/app/_components/actividad/grupos-tareas";
import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

/** «Mis tareas de hoy» en Inicio (CAR-162): vencidas y de hoy; sin tareas o sin permiso, no aparece. */
export async function TareasInicio() {
  const [identidad, r] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { limite: 50 }),
  ]);
  if (!r.ok || !identidad) return null;
  const gestiona = puedeDeIdentidad(identidad)(PERMISOS_CORE.actividadesManage);
  const ahora = new Date();
  const tareas = r.data.items.filter((t) => ["vencidas", "hoy"].includes(grupoDeTarea(t.vencimiento, ahora)));
  if (!tareas.length) return null;
  return (
    <SeccionTarjeta
      titulo="Mis tareas"
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
