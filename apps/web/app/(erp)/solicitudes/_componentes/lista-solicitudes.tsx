import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { haceCuanto } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";

import type { SolicitudDato } from "./datos";
import { CANAL, ESTADO } from "./etiquetas";

export const accionRegistrar = (
  <EnlaceBoton href="/solicitudes?nueva=1" icono={Plus}>
    Registrar solicitud
  </EnlaceBoton>
);

/** Query que conserva búsqueda y filtros al abrir una solicitud desde la lista. */
export function consultaLista(p: Parametros) {
  const q = new URLSearchParams();
  for (const k of ["q", "estado", "canal"]) if (p[k]) q.set(k, p[k]);
  const s = q.toString();
  return s ? `?${s}` : "";
}

const titulo = (s: SolicitudDato) => s.empresa ?? s.nombre ?? s.email ?? "Sin nombre";

/** Bandeja de solicitudes: canal visible por fila, filtros por estado y canal (diseño 01). */
export function ListaSolicitudes(p: {
  state: EstadoPantalla;
  items: SolicitudDato[];
  p: Parametros;
  seleccionada?: string;
  registrar?: ReactNode;
}) {
  const abiertas = p.items.filter((s) => s.estado === "nueva" || s.estado === "en_revision").length;
  const consulta = consultaLista(p.p);
  return (
    <ListaMaestro
      state={p.state}
      titulo="Solicitudes"
      buscar="Buscar por nombre, empresa o correo"
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: Object.entries(ESTADO).map(([valor, v]) => ({ valor, etiqueta: v.etiqueta })),
        },
        {
          param: "canal",
          etiqueta: "Canal",
          opciones: Object.entries(CANAL).map(([valor, v]) => ({ valor, etiqueta: v.etiqueta })),
        },
      ]}
      meta={{
        izquierda: `${p.items.length} solicitudes · ${abiertas} por procesar`,
        derecha: "Recientes primero",
      }}
      seleccionada={p.seleccionada}
      vacio={{
        titulo: "Aún no hay solicitudes",
        descripcion: "Las solicitudes que lleguen o registres aparecerán aquí.",
        ...(p.registrar ? { accion: p.registrar } : {}),
      }}
      {...(p.registrar ? { accion: <span className="md:hidden">{p.registrar}</span> } : {})}
      filas={p.items.map((s) => {
        const Icono = CANAL[s.canal].icono;
        return {
          id: s.id,
          href: `/solicitudes/${s.id}${consulta}`,
          inicio: (
            <span className="flex size-10 items-center justify-center rounded-full bg-fill text-fg-muted">
              <Icono aria-hidden className="size-4" />
              <span className="sr-only">{CANAL[s.canal].etiqueta}</span>
            </span>
          ),
          titulo: titulo(s),
          secundario: [CANAL[s.canal].etiqueta, haceCuanto(s.creadaEn)].join(" · "),
          terciario: s.duplicadaDeId ? <span>Duplicada de otra solicitud</span> : undefined,
          fin: (
            <Badge tono={ESTADO[s.estado].tono} punto={false}>
              {ESTADO[s.estado].etiqueta}
            </Badge>
          ),
        };
      })}
    />
  );
}
