import { UserCheck } from "lucide-react";

import { Badge, Estado, HerramientasLista, SplitScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarAprobaciones } from "./datos";
import { DetalleAprobacion } from "./detalle-aprobacion";
import { ListaAprobaciones } from "./lista-aprobaciones";

export const metadata = { title: "Aprobaciones" };

/** Bandeja de aprobaciones (44): lista y detalle; "Historial" con las resueltas. */
export default function Aprobaciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Aprobaciones"
      ruta="/configuracion/aprobaciones"
      completo
      cargar={async () => {
        const d = await cargarAprobaciones(await leerParametros(searchParams));
        return { ...d, ahora: Date.now() };
      }}
      opciones={(d) => ({
        titulo: d.historial ? "Historial de aprobaciones" : "Aprobaciones",
        ...(d.pendientes
          ? { insignia: <Badge tono="warning">{d.pendientes} pendientes</Badge> }
          : {}),
        acciones: (
          <EnlaceBoton
            href={d.historial ? "/configuracion/aprobaciones" : "?historial=1"}
            variante="ghost"
          >
            {d.historial ? "Pendientes" : "Historial"}
          </EnlaceBoton>
        ),
        accionesTelefono: (
          <EnlaceBoton
            href={d.historial ? "/configuracion/aprobaciones" : "?historial=1"}
            variante="ghost"
          >
            {d.historial ? "Pendientes" : "Historial"}
          </EnlaceBoton>
        ),
        ...(d.ver
          ? {
              volver: { href: "/configuracion/aprobaciones", etiqueta: "Aprobaciones" },
              volverSoloTelefono: true,
            }
          : {}),
      })}
    >
      {(d) => {
        const actual = d.items.find((a) => a.id === d.ver);
        return (
          <SplitScreen
            telefono={actual ? "detalle" : "lista"}
            etiquetaLista="Aprobaciones"
            vacio={{ texto: "Elige una aprobación para revisarla", icono: UserCheck }}
            lista={
              <>
                <h2 className="t-title mb-3 text-fg md:hidden">
                  {d.historial ? "Historial" : "Aprobaciones"}
                </h2>
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
                <div className="-mx-4 border-t border-border md:mx-0">
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
              </>
            }
            {...(actual ? { detalle: <DetalleAprobacion a={actual} /> } : {})}
          />
        );
      }}
    </PaginaPortal>
  );
}
