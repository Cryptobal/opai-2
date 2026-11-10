import { Upload } from "lucide-react";

import { ListScreen } from "@opai/ds";
import type { Vocabulario } from "@opai/domain";

import { MenuDocumento } from "@/app/_components/documentos/menu-documento-diferido";
import type { TipoDocumento } from "@/app/_components/documentos/tipos";
import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { Parametros } from "@/lib/parametros";

import { Paginacion } from "../../personas/_componentes/paginacion";
import type { FilaExplorador } from "./datos";
import { etiquetasEntidad, OPCIONES_ESTADO, OPCIONES_ORDEN } from "./etiquetas";
import { columnasDe, TarjetaDocumento } from "./filas";

type Props = {
  state: "ready" | "error" | "forbidden";
  items: FilaExplorador[];
  siguiente: string | null;
  total: number | null;
  tipos: TipoDocumento[];
  puedeSubir: boolean;
  voc: Vocabulario;
  p: Parametros;
};

const FILTROS_URL = ["q", "estado", "tipo", "entidad", "orden", "cursor", "prev"];

/** Enlace a una hoja (`?ver=<id>`, `?subir=1`) que conserva búsqueda, filtros y página de la lista. */
function conHoja(p: Parametros, hoja: Record<string, string>) {
  const q = new URLSearchParams(hoja);
  for (const k of FILTROS_URL) if (p[k]) q.set(k, p[k]);
  return `?${q.toString()}`;
}

/** Explorador (01): tabla en md+, tarjetas en teléfono; la fila abre la vista previa del documento. */
export function ListaDocumentos(x: Props) {
  const etiquetas = etiquetasEntidad(x.voc);
  const filtrando = Boolean(x.p["q"] || x.p["estado"] || x.p["tipo"] || x.p["entidad"]);
  const subir = x.puedeSubir ? (
    <EnlaceBotonHoja href={conHoja(x.p, { subir: "1" })} icono={Upload}>
      Subir documento
    </EnlaceBotonHoja>
  ) : null;
  return (
    <ListScreen<FilaExplorador>
      state={x.state}
      titulo="Documentos"
      {...(subir ? { accionPrincipal: subir } : {})}
      buscador={<Buscador placeholder="Buscar por nombre, título o etiqueta" />}
      filtros={
        <ChipsFiltro
          filtros={[
            { param: "estado", etiqueta: "Estado", opciones: OPCIONES_ESTADO },
            {
              param: "tipo",
              etiqueta: "Tipo",
              opciones: x.tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
            },
            {
              param: "entidad",
              etiqueta: "Entidad",
              opciones: Object.entries(etiquetas).map(([valor, etiqueta]) => ({ valor, etiqueta })),
            },
            { param: "orden", etiqueta: "Orden", opciones: OPCIONES_ORDEN },
          ]}
        />
      }
      items={x.items}
      clave={(d) => d.id}
      href={(d) => conHoja(x.p, { ver: d.id })}
      Link={LinkNext}
      paginacion={
        <Paginacion p={x.p} mostrados={x.items.length} siguiente={x.siguiente} total={x.total} />
      }
      tarjeta={(d) => <TarjetaDocumento d={d} etiquetas={etiquetas} />}
      columnas={columnasDe(etiquetas)}
      acciones={(d) => <MenuDocumento documento={d} />}
      textos={{
        vacio: filtrando
          ? {
              titulo: "Sin resultados",
              descripcion: "Prueba con otra búsqueda o quita algún filtro.",
            }
          : {
              titulo: "Aún no hay documentos",
              descripcion:
                "Sube el primero o genera uno desde una plantilla en la ficha de una persona.",
              ...(subir ? { accion: subir } : {}),
            },
      }}
    />
  );
}
