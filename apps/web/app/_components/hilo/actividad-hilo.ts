import type { FilaHilo } from "@opai/ds";

import { rutaDeEntidad } from "@/lib/ruta-entidad";

import { cuandoCorto } from "./datos-hilo";

type ItemActividad = {
  id: string;
  cuando: string;
  actor: { nombre: string; agente: boolean };
  accion: string;
  entidad?: { tipo: string; id: string } | null;
};

/** «Actividad»: lo último que hicieron las personas y los agentes (salida de `core.actividad.list`). */
export function actividadHilo(items: readonly ItemActividad[], ahora: Date): FilaHilo[] {
  return items.map((i) => {
    const href = rutaDeEntidad(i.entidad);
    return {
      id: i.id,
      cuando: cuandoCorto(i.cuando, ahora),
      quien: i.actor.nombre,
      ...(i.actor.agente ? { agente: true } : {}),
      texto: i.accion,
      ...(href ? { href } : {}),
    };
  });
}
