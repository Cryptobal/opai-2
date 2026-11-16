import type { ReactNode } from "react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conFiltros, type Parametros } from "@/lib/parametros";

import { estadoPantalla } from "@/lib/formato";

import { CerrarEnBloque } from "./acciones-registro";
import type { DatosRegistros, Registro } from "./datos";
import { cuando, estadoRegistro, OPCIONES_TIPO, tipoDe } from "./etiquetas";

type Props = {
  state: EstadoPantalla;
  items: Registro[];
  siguiente: string | null;
  p: Parametros;
  instalaciones: { id: string; nombre: string }[];
  seleccionado?: string;
  /** Acción de la lista (p. ej. «Cerrar en bloque» en En sitio con una instalación elegida). */
  accion?: ReactNode;
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

const VACIO = {
  en_sitio: {
    titulo: "Nadie en sitio",
    descripcion: "Quien entre por la portería aparecerá aquí hasta que salga.",
  },
  registros: {
    titulo: "Aún no hay registros",
    descripcion: "Las entradas que registre la portería de tus instalaciones aparecerán aquí.",
  },
};

/** Fila de la lista; abrir la ficha conserva la página de la lista (cursor), para no volver a la primera. */
function filaDe(r: Registro, p: Parametros) {
  const e = estadoRegistro(r);
  return {
    id: r.id,
    href: rutaAccesos(`/accesos/${r.id}`, p, p["cursor"] ? { cursor: p["cursor"] } : {}),
    titulo: r.nombre,
    secundario: [tipoDe(r.tipoRegistro), r.empresa].filter(Boolean).join(" · "),
    terciario: `${r.instalacion} · ${cuando(r.entradaEn)}`,
    fin: (
      <Badge tono={e.tono} punto>
        {e.etiqueta}
      </Badge>
    ),
  };
}

/** Columna de registros (diseño `Accesos`): nombre, tipo y empresa, instalación y hora, estado. */
function ListaRegistros({
  state,
  items,
  siguiente,
  p,
  instalaciones,
  seleccionado,
  accion,
}: Props) {
  const enSitio = p["estado"] === "en_sitio";
  return (
    <ListaMaestro
      state={state}
      titulo={enSitio ? "En sitio" : "Accesos"}
      {...(accion ? { accion } : {})}
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
      vacio={enSitio ? VACIO.en_sitio : VACIO.registros}
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
      filas={items.map((r) => filaDe(r, p))}
    />
  );
}

/** «Cerrar en bloque»: solo en En sitio, con una instalación elegida y para quien gestiona registros. */
function accionDe(d: DatosRegistros & { gestiona: boolean }) {
  const inst = d.p["instalacion"];
  if (!d.gestiona || d.p["estado"] !== "en_sitio" || !inst || !d.r.ok) return {};
  return { accion: <CerrarEnBloque instalacionId={inst} cuantos={d.r.data.items.length} /> };
}

/** La lista a partir de lo que carga `cargarRegistros` (la usan `/accesos` y `/accesos/[id]`). */
export function ListaDeAccesos({
  d,
  seleccionado,
}: {
  d: DatosRegistros & { gestiona: boolean };
  seleccionado?: string;
}) {
  return (
    <ListaRegistros
      state={estadoPantalla(d.r)}
      items={d.r.ok ? d.r.data.items : []}
      siguiente={d.r.ok ? d.r.data.siguiente : null}
      p={d.p}
      instalaciones={d.instalaciones}
      {...(seleccionado ? { seleccionado } : {})}
      {...accionDe(d)}
    />
  );
}
