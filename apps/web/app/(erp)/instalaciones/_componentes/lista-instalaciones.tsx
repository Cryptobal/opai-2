import { MapPin, Plus } from "lucide-react";

import { Badge, cn, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { ESTADO_INSTALACION, estadoDe } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { PaginacionListaMaestro } from "@/app/_components/maestros/paginacion-lista-maestro";
import { tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
import type { Parametros } from "@/lib/parametros";
import type { InstalacionFila } from "@/lib/tipos-maestros";

import { FiltroCuentaInstalaciones } from "./filtro-cuenta";
import { conFiltrosInstalaciones } from "./filtros-instalaciones";

type Props = {
  state: EstadoPantalla;
  items: InstalacionFila[];
  regiones: { valor: string; etiqueta: string }[];
  siguiente: string | null;
  cuentaEtiqueta: string | null;
  titulo: string;
  singular: string;
  seleccionada?: string;
  /** Búsqueda vigente: se conserva al abrir una ficha y al volver. */
  parametros: Parametros;
};

const personas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

/** Columna de instalaciones (06): icono, nombre, "cuenta · comuna", estado y dotación. */
export function ListaInstalaciones(p: Props) {
  const total = p.items.reduce((t, i) => t + i.dotacion, 0);
  const porPagina = tamanoPagina(p.parametros);
  const filtrando = Boolean(p.parametros.q || p.parametros.estado || p.parametros.cuenta || p.parametros.region);
  const nueva = (
    <EnlaceBoton href="/instalaciones/nueva" icono={Plus} variante={p.seleccionada ? "secondary" : "primary"}>
      Nueva
    </EnlaceBoton>
  );
  return (
    <ListaMaestro
      state={p.state}
      titulo={p.titulo}
      accion={nueva}
      vistas={{ lista: "instalaciones", ruta: "/instalaciones" }}
      buscar={`Buscar ${p.singular}`}
      vista={
        <div className="flex flex-wrap items-center gap-2 pb-2.5 md:px-4 md:pb-0">
          <FiltroCuentaInstalaciones cuentaInicial={p.cuentaEtiqueta} />
          <ChipsFiltro
            filtros={[
              {
                param: "estado",
                etiqueta: "Estado",
                opciones: Object.entries(ESTADO_INSTALACION).map(([valor, e]) => ({
                  valor,
                  etiqueta: e.etiqueta,
                })),
              },
              { param: "region", etiqueta: "Región", opciones: p.regiones },
            ]}
          />
        </div>
      }
      meta={{
        izquierda: filtrando
          ? `${p.items.length}${p.siguiente ? "+" : ""} ${p.items.length === 1 ? "resultado" : "resultados"}`
          : `${p.items.length}${p.siguiente ? "+" : ""} ${p.titulo.toLowerCase()}`,
        derecha: personas(total),
      }}
      pie={
        p.state === "ready" ? (
          <PaginacionListaMaestro
            p={p.parametros}
            rutaBase="/instalaciones"
            mostrados={p.items.length}
            siguiente={p.siguiente}
            porPagina={porPagina}
          />
        ) : undefined
      }
      seleccionada={p.seleccionada}
      vacio={
        filtrando
          ? { titulo: "Sin resultados", descripcion: "Prueba otro término o quita un filtro." }
          : {
              titulo: `Aún no hay ${p.titulo.toLowerCase()}`,
              descripcion: "Crea la primera para definir sus puestos y documentos.",
              accion: nueva,
            }
      }
      filas={p.items.map((i) => {
        const e = estadoDe(ESTADO_INSTALACION, i.estado);
        const sel = p.seleccionada === i.id;
        return {
          id: i.id,
          href: conFiltrosInstalaciones(`/instalaciones/${i.id}`, p.parametros),
          inicio: (
            <span
              aria-hidden
              className={cn(
                "flex size-9 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted",
                sel && "bg-surface text-accent shadow-[inset_0_0_0_1px_var(--ds-accent)]",
              )}
            >
              <MapPin className="size-4" />
            </span>
          ),
          titulo: i.nombre,
          secundario: [i.cuenta, i.comuna].filter(Boolean).join(" · "),
          fin: (
            <>
              <Badge tono={e.tono}>{e.etiqueta}</Badge>
              <span className="t-caption hidden md:block">{personas(i.dotacion)}</span>
            </>
          ),
        };
      })}
    />
  );
}