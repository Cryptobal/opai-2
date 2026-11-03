import { textoVencimiento } from "@opai/domain";
import { SeccionTarjeta } from "@opai/ds";

import { TareaConAcciones } from "./tarea-accion";
import type { ActividadVista } from "./tipos";

/** «Tareas abiertas» de una ficha: las pendientes, la más próxima primero. */
export function TareasFicha({ tareas, gestiona }: { tareas: ActividadVista[]; gestiona: boolean }) {
  if (!tareas.length) return null;
  const ahora = new Date();
  return (
    <SeccionTarjeta titulo={`Tareas abiertas (${tareas.length})`}>
      <div className="flex flex-col">
        {tareas.map((t) => {
          const v = textoVencimiento(t.vencimiento, t.todoElDia, ahora);
          return (
            <TareaConAcciones
              key={t.id}
              id={t.id}
              titulo={t.titulo}
              vencimiento={t.vencimiento}
              texto={v.texto}
              tono={v.tono}
              prioridad={t.prioridad ?? undefined}
              responsables={t.responsablesDetalle.map((r) => r.nombre)}
              gestiona={gestiona}
            />
          );
        })}
      </div>
    </SeccionTarjeta>
  );
}
