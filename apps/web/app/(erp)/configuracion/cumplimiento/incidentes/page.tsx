import { Plus } from "lucide-react";

import { Estado } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarIncidentes } from "../_componentes/datos";
import { DetalleIncidente } from "../_componentes/detalle-incidente";
import { HojaIncidente } from "../_componentes/diferidas";
import { ListaIncidentes } from "../_componentes/lista-incidentes";
import { PaginaCumplimiento } from "../_componentes/pagina-cumplimiento";

export const metadata = { title: "Incidentes de datos personales" };

/** Datos personales · Incidentes (Brief 07d bloque 7-UI): registro manual y aviso de brechas. */
export default function Incidentes({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaCumplimiento
      pestana="incidentes"
      cargar={async () => cargarIncidentes(await leerParametros(searchParams))}
      acciones={(_, puede) =>
        puede.gestionar ? (
          <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
            Registrar incidente
          </EnlaceBotonHoja>
        ) : null
      }
    >
      {(d, puede) => (
        <>
          {d.actual ? (
            <div className="flex flex-col gap-3">
              <EnlaceBoton
                href="/configuracion/cumplimiento/incidentes"
                variante="ghost"
                className="self-start"
              >
                ‹ Incidentes
              </EnlaceBoton>
              <DetalleIncidente i={d.actual} gestionar={puede.gestionar} />
            </div>
          ) : (
            <div className="-mx-4 border-t border-border md:mx-0 md:rounded-md md:border">
              <Estado
                state={d.state === "ready" && d.items.length === 0 ? "empty" : d.state}
                variante="lista"
                textos={{
                  vacio: {
                    titulo: "Sin incidentes registrados",
                    descripcion:
                      "Si detectas una posible brecha de datos personales, regístrala para llevar el plazo de aviso a la Agencia y a los titulares.",
                  },
                }}
              >
                <ListaIncidentes items={d.items} />
              </Estado>
            </div>
          )}
          {puede.gestionar ? <HojaIncidente /> : null}
        </>
      )}
    </PaginaCumplimiento>
  );
}
