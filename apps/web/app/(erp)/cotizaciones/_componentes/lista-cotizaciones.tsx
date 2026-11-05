import { Plus } from "lucide-react";

import { Badge } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";
import { estadoCpqBadge } from "@/lib/cpq-presentacion";

import type { DatosCotizaciones } from "./datos";
import { margenLista, ventaLista } from "./lista-cotizaciones-helpers";

/** Columna izquierda del patrón lista y ficha (CAR-141). */
export function ListaCotizaciones({
  datos: d,
  seleccionada,
  q,
  base = "/cotizaciones",
}: {
  datos: DatosCotizaciones;
  seleccionada?: string;
  q?: string;
  base?: string;
}) {
  const nueva = d.crear ? (
    <EnlaceBotonHoja href={`${base === "/cotizaciones" ? "/cotizaciones/nueva" : `${base}/nueva`}`} icono={Plus}>
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
        { param: "ver", etiqueta: "Mostrar", opciones: [{ valor: "archivadas", etiqueta: "Archivadas" }] },
      ]}
      meta={{
        izquierda: `${d.items.length} ${d.archivadas ? "archivadas" : "cotizaciones"}`,
        derecha: "Más recientes",
      }}
      seleccionada={seleccionada}
      vacio={
        d.archivadas
          ? { titulo: "No hay cotizaciones archivadas", descripcion: "Las que archives aparecen aquí y se pueden restaurar." }
          : {
              titulo: "Aún no hay cotizaciones",
              descripcion: "Crea una cotización ligada a un negocio abierto.",
              accion: nueva,
            }
      }
      pie={
        d.siguiente ? (
          <LinkNext
            href={conBusqueda(`${base}?cursor=${d.siguiente}${d.archivadas ? "&ver=archivadas" : ""}`, q)}
            className="t-label text-accent"
          >
            Siguiente página
          </LinkNext>
        ) : undefined
      }
      filas={d.items.map((c) => {
        const e = estadoCpqBadge(c.version?.estado ?? "borrador");
        const margen = margenLista(c, d.costos);
        return {
          id: c.id,
          href: d.archivadas ? `${base}/${c.id}?ver=archivadas` : conBusqueda(`${base}/${c.id}`, q),
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
                  {c.resumenCalculo.semaforo}
                </Badge>
              ) : null}
            </div>
          ),
        };
      })}
    />
  );
}
