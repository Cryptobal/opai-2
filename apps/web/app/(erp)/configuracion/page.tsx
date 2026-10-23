import { Settings, UserCheck } from "lucide-react";

import { Alerta, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarIndice } from "./_centro/datos";
import { IndiceConfig } from "./_centro/indice-config";

export const metadata = { title: "Configuración" };

/** Centro de Configuración (19/20): índice por ámbitos; en md+, "Elige un ajuste" a la derecha. */
export default function Configuracion({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Configuración"
      ruta="/configuracion"
      completo
      cargar={async () => {
        const [indice, p] = await Promise.all([cargarIndice(), leerParametros(searchParams)]);
        return { indice, q: p["q"] };
      }}
    >
      {({ indice, q }) => (
        <SplitScreen
          telefono="lista"
          etiquetaLista="Índice de configuración"
          lista={
            <>
              <h2 className="t-title mb-3 text-fg md:hidden">Configuración</h2>
              <IndiceConfig indice={indice} q={q} conBuscador />
            </>
          }
          detalle={
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted">
                <Settings className="size-5" aria-hidden />
              </span>
              <p className="text-md font-semibold text-fg">Elige un ajuste</p>
              <p className="max-w-80 text-base text-fg-muted">
                Selecciona una sección del índice o búscala con ⌘K.
              </p>
              {indice.aprobaciones ? (
                <Alerta
                  tono="warning"
                  icono={UserCheck}
                  titulo={`${indice.aprobaciones} ${indice.aprobaciones === 1 ? "aprobación de agente espera" : "aprobaciones de agentes esperan"} tu revisión`}
                  accion={
                    <EnlaceBoton href="/configuracion/aprobaciones" variante="ghost">
                      Revisar
                    </EnlaceBoton>
                  }
                  className="mt-4"
                />
              ) : null}
            </div>
          }
        />
      )}
    </PaginaPortal>
  );
}
