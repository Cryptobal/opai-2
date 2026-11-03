import dynamic from "next/dynamic";

import { PERMISOS_CORE } from "@opai/domain";
import { Estado, Segmentado, Skeleton, Timeline } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { itemActividad } from "./frases";
import { TareasFicha } from "./tareas-ficha";
import {
  FILTROS_ACTIVIDAD,
  type FichaActividad,
  type FiltroActividad,
  type ItemOrdenado,
  type ListaActividades,
} from "./tipos";

// El compositor se carga aparte del primer JS de la ficha (ADR-037).
const CompositorResponsivo = dynamic(() =>
  import("./compositor-telefono").then((m) => m.CompositorResponsivo),
  { loading: () => <Skeleton className="h-12 w-full" /> },
);

const esFiltro = (v: string | undefined): v is FiltroActividad =>
  FILTROS_ACTIVIDAD.some((f) => f.id === v);

type Props = {
  ficha: FichaActividad;
  /** Valor de `?tipo=` de la URL. */
  tipo: string | undefined;
  /** Ruta de la pestaña (sin consulta) y parámetros que el filtro conserva. */
  base: string;
  consulta?: string;
  /** Eventos de sistema ya armados (etapas, auditoría) que se mezclan con lo registrado. */
  sistema: ItemOrdenado[];
};

/** Actividad de una ficha (CAR-162): compositor, tareas abiertas y línea de tiempo mixta con filtros. */
export async function PanelActividad({ ficha, tipo, base, consulta = "", sistema }: Props) {
  const filtro: FiltroActividad = esFiltro(tipo) ? tipo : "todo";
  const entidad = { tipo: ficha.tipo, id: ficha.id };
  const [identidad, linea, abiertas] = await Promise.all([
    identidadActual(),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.timeline", {
      entidadTipo: ficha.tipo,
      entidadId: ficha.id,
      limite: 50,
      ...(filtro !== "todo" && filtro !== "sistema"
        ? { tipos: filtro === "correo" ? ["correo", "whatsapp"] : [filtro] }
        : {}),
    }),
    ejecutarComoUsuario<ListaActividades>("erp", "core.actividades.tareas", { entidad, limite: 50 }),
  ]);
  const gestiona = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.actividadesManage) : false;
  const registradas = filtro === "sistema" || !linea.ok ? [] : linea.data.items.map(itemActividad);
  const items = [...registradas, ...(filtro === "todo" || filtro === "sistema" ? sistema : [])].sort(
    (a, b) => b.orden.localeCompare(a.orden),
  );
  const enlace = (id: string) => {
    const q = new URLSearchParams(consulta);
    if (id !== "todo") q.set("tipo", id);
    else q.delete("tipo");
    const t = q.toString();
    return t ? `${base}?${t}` : base;
  };
  return (
    <div className="flex flex-col gap-4">
      {gestiona ? <CompositorResponsivo ficha={ficha} /> : null}
      {abiertas.ok ? <TareasFicha tareas={abiertas.data.items} gestiona={gestiona} /> : null}
      <Segmentado
        etiqueta="Filtrar actividad"
        activa={filtro}
        Link={LinkNext}
        opciones={FILTROS_ACTIVIDAD.map((f) => ({ ...f, href: enlace(f.id) }))}
        className="max-w-full self-start overflow-x-auto"
      />
      <Estado
        state={linea.ok && items.length === 0 ? "empty" : estadoPantalla(linea)}
        variante="detalle"
        textos={{
          vacio: {
            titulo: "Sin actividad todavía",
            descripcion: gestiona
              ? "Registra la primera nota o tarea de esta ficha."
              : "Las notas, llamadas y tareas de esta ficha aparecerán aquí.",
          },
        }}
      >
        <Timeline items={items} />
      </Estado>
    </div>
  );
}
