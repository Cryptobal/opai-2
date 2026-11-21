import { Plus } from "lucide-react";

import { Badge } from "@opai/ds";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { queryConCambios, tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
import { PaginacionListaMaestro } from "@/app/_components/maestros/paginacion-lista-maestro";
import type { Parametros } from "@/lib/parametros";
import { semaforoEtiqueta } from "@/lib/cpq-presentacion";

import type { DatosCotizaciones } from "./datos";
import { estadoLista, margenLista, pideRecalcular, ventaLista } from "./lista-cotizaciones-helpers";

/** Columna izquierda del patrón lista y ficha (CAR-141). */
export function ListaCotizaciones({
  datos: d,
  seleccionada,
  p,
  base = "/cotizaciones",
}: {
  datos: DatosCotizaciones;
  seleccionada?: string;
  p: Parametros;
  base?: string;
}) {
  const nueva = d.crear ? (
    <EnlaceBotonHoja
      href={`${base === "/cotizaciones" ? "/cotizaciones/nueva" : `${base}/nueva`}`}
      icono={Plus}
    >
      Nueva
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListaMaestro
      state={d.state}
      titulo="Cotizaciones"
      accion={nueva}
      buscar="Buscar cotización"
      filtros={[
        {
          param: "ver",
          etiqueta: "Mostrar",
          opciones: [{ valor: "archivadas", etiqueta: "Archivadas" }],
        },
      ]}
      meta={{
        izquierda: `${d.items.length}${d.siguiente ? "+" : ""} ${p["q"]?.trim() ? "resultados" : d.archivadas ? "archivadas" : "cotizaciones"}`,
        derecha: "Más recientes",
      }}
      seleccionada={seleccionada}
      vacio={
        p["q"]?.trim()
          ? { titulo: "Sin resultados", descripcion: "Prueba con otra búsqueda." }
          : d.archivadas
            ? {
                titulo: "No hay cotizaciones archivadas",
                descripcion: "Las que archives aparecen aquí y se pueden restaurar.",
              }
            : {
                titulo: "Aún no hay cotizaciones",
                descripcion: "Crea una cotización ligada a un negocio abierto.",
                accion: nueva,
              }
      }
      pie={
        d.state === "ready" ? (
          <PaginacionListaMaestro
            p={p}
            rutaBase={base}
            mostrados={d.items.length}
            siguiente={d.siguiente}
            porPagina={tamanoPagina(p, 20)}
          />
        ) : undefined
      }
      filas={d.items.map((c) => {
        const e = estadoLista(c);
        const margen = margenLista(c, d.costos);
        return {
          id: c.id,
          href: `${base}/${c.id}${queryConCambios(p, {})}`,
          titulo: (
            <>
              <span className="t-mono text-[13px]">{c.codigo}</span>
              <span className="t-body-sm block truncate">{c.titulo}</span>
            </>
          ),
          secundario: (
            <>
              {c.cuentaTitulo ?? c.negocioTitulo ?? "Sin cuenta"}
              <span className="md:hidden"> · {e.etiqueta}</span>
            </>
          ),
          terciario: (
            <span className="t-caption">
              v{c.version?.numero ?? "—"} · {ventaLista(c)}
              {margen ? ` · Margen ${margen}` : null}
              {pideRecalcular(c, d.costos) ? " · Recalcular" : null}
            </span>
          ),
          fin: (
            <div className="hidden flex-col items-end gap-1 md:flex">
              <Badge tono={e.tono}>{e.etiqueta}</Badge>
              {d.costos && c.resumenCalculo?.semaforo ? (
                <Badge
                  tono={
                    c.resumenCalculo.semaforo === "verde"
                      ? "success"
                      : c.resumenCalculo.semaforo === "rojo"
                        ? "danger"
                        : "warning"
                  }
                  punto
                >
                  {semaforoEtiqueta(c.resumenCalculo.semaforo)}
                </Badge>
              ) : null}
            </div>
          ),
        };
      })}
    />
  );
}
