import { Plus } from "lucide-react";

import { Badge } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { fecha } from "@/lib/fechas";
import { semaforoEtiqueta } from "@/lib/cpq-presentacion";

import type { DatosCotizaciones } from "./datos";
import { conFiltrosCotizaciones } from "./filtros-cotizaciones";
import { FiltrosFechaEnvio } from "./filtros-fecha-envio";
import { estadoLista, margenLista, pideRecalcular, ventaLista } from "./lista-cotizaciones-helpers";
import { opcionesEstadoCpq } from "./opciones-filtro-cpq";

/** Columna izquierda del patrón lista y ficha (CAR-141). */
export function ListaCotizaciones({
  datos: d,
  seleccionada,
  base = "/cotizaciones",
}: {
  datos: DatosCotizaciones;
  seleccionada?: string;
  base?: string;
}) {
  const p = d.parametros;
  const nueva = d.crear ? (
    <EnlaceBotonHoja
      href={`${base === "/cotizaciones" ? "/cotizaciones/nueva" : `${base}/nueva`}`}
      icono={Plus}
      variante={seleccionada ? "secondary" : "primary"}
    >
      Nueva
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListaMaestro
      state={d.state}
      titulo="Cotizaciones"
      accion={nueva}
      vistas={{ lista: "cotizaciones", ruta: base }}
      buscar="Buscar cotización"
      filtros={
        d.archivadas
          ? []
          : [
              { param: "estado", etiqueta: "Estado", opciones: opcionesEstadoCpq },
              { param: "cuenta", etiqueta: "Cuenta", opciones: d.cuentas },
              { param: "responsable", etiqueta: "Responsable", opciones: d.responsables },
              {
                param: "ver",
                etiqueta: "Mostrar",
                opciones: [{ valor: "archivadas", etiqueta: "Archivadas" }],
              },
            ]
      }
      debajoFiltros={d.archivadas ? undefined : <FiltrosFechaEnvio />}
      meta={{
        izquierda: `${d.items.length} ${d.archivadas ? "archivadas" : "cotizaciones"}`,
        derecha: "Más recientes",
      }}
      seleccionada={seleccionada}
      vacio={
        d.archivadas
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
        d.siguiente ? (
          <LinkNext
            href={conFiltrosCotizaciones(`${base}`, { ...p, cursor: d.siguiente ?? undefined })}
            className="t-label text-accent"
          >
            Siguiente página
          </LinkNext>
        ) : undefined
      }
      filas={d.items.map((c) => {
        const e = estadoLista(c);
        const margen = margenLista(c, d.costos);
        return {
          id: c.id,
          href: conFiltrosCotizaciones(`${base}/${c.id}`, p),
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
              {c.version?.enviadaEn ? ` · Enviada ${fecha(c.version.enviadaEn)}` : null}
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
