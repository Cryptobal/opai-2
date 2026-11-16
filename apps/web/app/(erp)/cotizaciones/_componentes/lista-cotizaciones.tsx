import { Plus } from "lucide-react";

import { Badge } from "@opai/ds";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { PaginacionListaMaestro } from "@/app/_components/maestros/paginacion-lista-maestro";
import { tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
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
  const porPagina = tamanoPagina(p);
  const filtrando = Boolean(
    p.q || p.estado || p.cuenta || p.responsable || p.desde || p.hasta || d.archivadas,
  );
  const metaConteo = filtrando
    ? `${d.items.length}${d.siguiente ? "+" : ""} ${d.items.length === 1 ? "resultado" : "resultados"}`
    : `${d.items.length}${d.siguiente ? "+" : ""} ${d.archivadas ? "archivadas" : "cotizaciones"}`;
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
      meta={{ izquierda: metaConteo, derecha: "Más recientes" }}
      seleccionada={seleccionada}
      vacio={
        filtrando
          ? {
              titulo: "Sin resultados",
              descripcion: "Prueba otro término: cuenta, título o número de cotización.",
            }
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
            porPagina={porPagina}
          />
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
