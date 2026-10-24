import { Badge, Estado, HerramientasLista } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { PaginaConfig } from "../_centro/pagina-config";
import { cargarAprobaciones } from "./datos";
import { DetalleAprobacion } from "./detalle-aprobacion";
import { ListaAprobaciones } from "./lista-aprobaciones";

export const metadata = { title: "Aprobaciones" };

/**
 * Bandeja de aprobaciones (44) dentro del centro de Configuración: la lista, o el detalle de la
 * elegida con «‹ Aprobaciones»; «Historial» muestra las resueltas.
 */
export default function Aprobaciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="aprobaciones"
      titulo={(d) => (d.historial ? "Historial de aprobaciones" : "Aprobaciones")}
      cargar={async () => {
        const d = await cargarAprobaciones(await leerParametros(searchParams));
        return { ...d, ahora: Date.now() };
      }}
      cabecera={(d) => ({
        subtitulo: d.pendientes ? (
          <Badge tono="warning">{d.pendientes} pendientes</Badge>
        ) : undefined,
        acciones: (
          <EnlaceBoton
            href={d.historial ? "/configuracion/aprobaciones" : "?historial=1"}
            variante="secondary"
          >
            {d.historial ? "Pendientes" : "Historial"}
          </EnlaceBoton>
        ),
      })}
    >
      {(d) => {
        const actual = d.items.find((a) => a.id === d.ver);
        if (actual) {
          return (
            <div className="flex flex-col gap-3">
              <EnlaceBoton
                href={d.historial ? "?historial=1" : "/configuracion/aprobaciones"}
                variante="ghost"
                className="self-start"
              >
                ‹ Aprobaciones
              </EnlaceBoton>
              <DetalleAprobacion a={actual} />
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-3">
            <HerramientasLista>
              <ChipsFiltro
                filtros={[
                  {
                    param: "riesgo",
                    etiqueta: "Riesgo",
                    opciones: [
                      { valor: "alto", etiqueta: "Alto" },
                      { valor: "medio", etiqueta: "Medio" },
                    ],
                  },
                  { param: "agente", etiqueta: "Agente", opciones: d.agentes },
                ]}
              />
            </HerramientasLista>
            <div className="-mx-4 border-t border-border md:mx-0 md:rounded-md md:border">
              <Estado
                state={d.state === "ready" && d.items.length === 0 ? "empty" : d.state}
                variante="lista"
                textos={{
                  vacio: d.historial
                    ? { titulo: "Sin aprobaciones resueltas" }
                    : {
                        titulo: "Nada por aprobar",
                        descripcion:
                          "Cuando un agente pida una acción irreversible, aparecerá aquí.",
                      },
                }}
              >
                <ListaAprobaciones items={d.items} ver={d.ver} ahora={d.ahora} />
              </Estado>
            </div>
          </div>
        );
      }}
    </PaginaConfig>
  );
}
