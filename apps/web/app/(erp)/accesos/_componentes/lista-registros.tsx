import { Badge, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conFiltros, type Parametros } from "@/lib/parametros";

import type { Registro } from "./datos";
import { estadoRegistro, hora, OPCIONES_TIPO, tipoDe } from "./etiquetas";

type Props = {
  state: EstadoPantalla;
  items: Registro[];
  siguiente: string | null;
  p: Parametros;
  instalaciones: { id: string; nombre: string }[];
  seleccionado?: string;
};

/** Ruta con los filtros de Accesos (instalación y tipo, además de búsqueda y estado). */
export function rutaAccesos(
  base: string,
  p: Parametros,
  extra: Record<string, string> = {},
): string {
  const url = new URL(conFiltros(base, p), "http://x");
  for (const k of ["instalacion", "tipo", "motivo"] as const)
    if (p[k]) url.searchParams.set(k, p[k]);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.pathname + url.search;
}

/** Columna de registros (diseño `Accesos`): nombre, tipo y empresa, instalación y hora, estado. */
export function ListaRegistros({ state, items, siguiente, p, instalaciones, seleccionado }: Props) {
  const enSitio = p["estado"] === "en_sitio";
  return (
    <ListaMaestro
      state={state}
      titulo={enSitio ? "En sitio" : "Accesos"}
      buscar="Buscar por nombre, empresa o patente"
      filtros={[
        {
          param: "instalacion",
          etiqueta: "Instalación",
          opciones: instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
        },
        { param: "tipo", etiqueta: "Tipo", opciones: OPCIONES_TIPO },
      ]}
      meta={{
        izquierda: `${items.length}${siguiente ? "+" : ""} ${items.length === 1 ? "registro" : "registros"}`,
        derecha: "Más reciente primero",
      }}
      seleccionada={seleccionado}
      vacio={
        enSitio
          ? {
              titulo: "Nadie en sitio",
              descripcion: "Quien entre por la portería aparecerá aquí hasta que salga.",
            }
          : {
              titulo: "Aún no hay registros",
              descripcion:
                "Las entradas que registre la portería de tus instalaciones aparecerán aquí.",
            }
      }
      pie={
        siguiente ? (
          <LinkNext
            href={rutaAccesos("/accesos", p, { cursor: siguiente })}
            className="t-label px-4 py-3 text-accent"
          >
            Siguiente página
          </LinkNext>
        ) : undefined
      }
      filas={items.map((r) => {
        const e = estadoRegistro(r);
        return {
          id: r.id,
          href: rutaAccesos(`/accesos/${r.id}`, p),
          titulo: r.nombre,
          secundario: [tipoDe(r.tipoRegistro), r.empresa].filter(Boolean).join(" · "),
          terciario: `${r.instalacion} · ${hora(r.entradaEn)}`,
          fin: (
            <Badge tono={e.tono} punto>
              {e.etiqueta}
            </Badge>
          ),
        };
      })}
    />
  );
}
