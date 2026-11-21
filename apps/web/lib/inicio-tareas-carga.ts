import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

/** Carga tareas del inicio (bloques «hoy» y «agenda»). */
export async function inicioTareasCarga(limite: number) {
  const [identidad, r] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { limite }),
  ]);
  return { identidad, r };
}