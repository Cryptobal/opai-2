import { Plus } from "lucide-react";

import { Estado, HerramientasLista } from "@opai/ds";

import { HojaSolicitud } from "@/app/_components/cumplimiento/diferidas";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarSolicitudes } from "../_componentes/datos";
import { DetalleSolicitud } from "../_componentes/detalle-solicitud";
import { ListaSolicitudes } from "../_componentes/lista-solicitudes";
import { PaginaCumplimiento } from "../_componentes/pagina-cumplimiento";
import { ESTADO_SOLICITUD, TIPOS_SOLICITUD } from "../_componentes/tipos";

export const metadata = { title: "Solicitudes de titulares" };

const opciones = (m: Record<string, string | { etiqueta: string }>) =>
  Object.entries(m).map(([valor, v]) => ({
    valor,
    etiqueta: typeof v === "string" ? v : v.etiqueta,
  }));

/**
 * Datos personales · Solicitudes (Brief 07d bloque 8): bandeja ARCO+ con estado, derecho y semáforo
 * del plazo; `?ver=<id>` abre la ficha con las acciones. Las solicitudes se registran internamente
 * (§16.3: llegan por correo o papel).
 */
export default function Solicitudes({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaCumplimiento
      pestana="solicitudes"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const filtros = new URLSearchParams(
          Object.entries({ estado: p["estado"], tipo: p["tipo"] }).filter(
            (x): x is [string, string] => !!x[1],
          ),
        ).toString();
        return { ...(await cargarSolicitudes(p)), filtros };
      }}
      acciones={(_, puede) =>
        puede.gestionar ? (
          <EnlaceBotonHoja href="?solicitud=1" icono={Plus}>
            Nueva solicitud
          </EnlaceBotonHoja>
        ) : null
      }
    >
      {(d, puede) => (
        <>
          {d.actual ? (
            <div className="flex flex-col gap-3">
              <EnlaceBoton
                href={`/configuracion/cumplimiento/solicitudes${d.filtros ? `?${d.filtros}` : ""}`}
                variante="ghost"
                className="self-start"
              >
                ‹ Solicitudes
              </EnlaceBoton>
              <DetalleSolicitud s={d.actual} yo={d.yo} gestionar={puede.gestionar} />
            </div>
          ) : (
            <>
              <HerramientasLista>
                <ChipsFiltro
                  filtros={[
                    { param: "estado", etiqueta: "Estado", opciones: opciones(ESTADO_SOLICITUD) },
                    { param: "tipo", etiqueta: "Derecho", opciones: opciones(TIPOS_SOLICITUD) },
                  ]}
                />
              </HerramientasLista>
              <div className="-mx-4 border-t border-border md:mx-0 md:rounded-md md:border">
                <Estado
                  state={d.state === "ready" && d.items.length === 0 ? "empty" : d.state}
                  variante="lista"
                  textos={{
                    vacio: {
                      titulo: d.filtros ? "Sin solicitudes con estos filtros" : "Sin solicitudes",
                      descripcion:
                        "Cuando un titular pida acceso, rectificación, cancelación, oposición, portabilidad o bloqueo, regístralo aquí.",
                      ...(puede.gestionar
                        ? {
                            accion: (
                              <EnlaceBotonHoja
                                href="?solicitud=1"
                                icono={Plus}
                                variante="secondary"
                              >
                                Registrar solicitud
                              </EnlaceBotonHoja>
                            ),
                          }
                        : {}),
                    },
                  }}
                >
                  <ListaSolicitudes items={d.items} consulta={d.filtros} />
                </Estado>
              </div>
              {d.siguiente ? (
                <EnlaceBoton
                  href={`?${d.filtros ? `${d.filtros}&` : ""}cursor=${d.siguiente}`}
                  variante="secondary"
                  className="self-center"
                >
                  Ver más antiguas
                </EnlaceBoton>
              ) : null}
            </>
          )}
          {puede.gestionar ? <HojaSolicitud /> : null}
        </>
      )}
    </PaginaCumplimiento>
  );
}
