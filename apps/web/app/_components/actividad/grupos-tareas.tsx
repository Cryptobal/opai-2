import { ETIQUETA_GRUPO_TAREA, type GrupoTarea, grupoDeTarea, textoVencimiento } from "@opai/domain";
import { Enlace } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { TareaConAcciones } from "./tarea-accion";
import { type ActividadVista, RUTA_ENTIDAD } from "./tipos";

const ORDEN: GrupoTarea[] = ["vencidas", "hoy", "semana", "despues", "sin_fecha"];

/** Ficha a la que apunta la fila: el negocio si lo hay, si no la primera ligada. */
function vinculoDe(t: ActividadVista) {
  const v = t.vinculosDetalle.find((x) => x.tipo === "negocio") ?? t.vinculosDetalle[0];
  return v ? (
    <Enlace Link={LinkNext} href={`${RUTA_ENTIDAD[v.tipo]}/${v.id}`}>
      {v.nombre}
    </Enlace>
  ) : undefined;
}

/** Tareas agrupadas por vencimiento (Mis tareas e Inicio). `solo` acota los grupos que se muestran. */
export function GruposTareas({
  tareas,
  gestiona,
  solo = ORDEN,
}: {
  tareas: ActividadVista[];
  gestiona: boolean;
  solo?: GrupoTarea[];
}) {
  const ahora = new Date();
  return (
    <div className="flex flex-col gap-5">
      {ORDEN.filter((g) => solo.includes(g)).map((g) => {
        const del = tareas.filter((t) => grupoDeTarea(t.vencimiento, ahora) === g);
        if (!del.length) return null;
        return (
          <section key={g} aria-label={ETIQUETA_GRUPO_TAREA[g]} className="flex flex-col">
            <h3 className={g === "vencidas" ? "t-label text-danger-fg" : "t-label"}>
              {ETIQUETA_GRUPO_TAREA[g]} · {del.length}
            </h3>
            {del.map((t) => {
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
                  vinculo={vinculoDe(t)}
                  gestiona={gestiona}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
