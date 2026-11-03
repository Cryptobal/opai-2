import { PERMISOS_CORE } from "@opai/domain";
import { Estado, Segmentado } from "@opai/ds";

import { GruposTareas } from "@/app/_components/actividad/grupos-tareas";
import { NuevaTarea } from "@/app/_components/actividad/nueva-tarea";
import type { ListaActividades } from "@/app/_components/actividad/tipos";
import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

/** Mis tareas (CAR-162): las propias o las del equipo, por vencimiento; marcar hecha y posponer. */
export async function MisTareas({ ver }: { ver: "yo" | "equipo" }) {
  const [identidad, r] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", {
      limite: 100,
      ...(ver === "equipo" ? { equipo: true } : {}),
    }),
  ]);
  const gestiona = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.actividadesManage) : false;
  const tareas = r.ok ? r.data.items : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta="Ver tareas de"
          activa={ver}
          Link={LinkNext}
          opciones={[
            { id: "yo", etiqueta: "Yo", href: "/tareas" },
            { id: "equipo", etiqueta: "Mi equipo", href: "/tareas?ver=equipo" },
          ]}
        />
        {gestiona ? <NuevaTarea /> : null}
      </div>
      <Estado
        state={r.ok && tareas.length === 0 ? "empty" : estadoPantalla(r)}
        variante="lista"
        textos={{
          vacio: {
            titulo: ver === "yo" ? "No tienes tareas pendientes" : "El equipo no tiene tareas pendientes",
            descripcion: "Las tareas que crees en un negocio, una cuenta o una instalación llegan aquí.",
          },
        }}
      >
        <GruposTareas tareas={tareas} gestiona={gestiona} />
      </Estado>
    </div>
  );
}
