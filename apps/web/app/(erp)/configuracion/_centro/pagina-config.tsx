import type { ReactNode } from "react";

import { Cabecera, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarIndice, type Indice } from "./datos";
import { IndiceConfig } from "./indice-config";

type Cab = { subtitulo?: ReactNode; acciones?: ReactNode };

type Props<T> = {
  /** Id de la sección (resalta el índice). */
  seccion: string;
  titulo: string;
  cargar?: () => Promise<T>;
  /** Subtítulo y acción principal de la sección (dependen de los datos). */
  cabecera?: (datos: T, indice: Indice) => Cab;
  children: (datos: T, indice: Indice) => ReactNode;
};

/**
 * Sección del centro de Configuración: índice angosto a la izquierda (iPad y desktop) y la sección
 * a la derecha con su título y acción; en teléfono, la sección con "‹ Configuración".
 */
export function PaginaConfig<T = undefined>({
  seccion,
  titulo,
  cargar,
  cabecera,
  children,
}: Props<T>) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Configuración"
      ruta="/configuracion"
      completo
      cargando="detalle"
      volver={{ href: "/configuracion", etiqueta: "Configuración" }}
      volverSoloTelefono
      cargar={async () => {
        const [indice, datos] = await Promise.all([cargarIndice(), cargar ? cargar() : undefined]);
        return { indice, datos: datos as T };
      }}
    >
      {({ indice, datos }) => {
        const c = cabecera?.(datos, indice) ?? {};
        return (
          <SplitScreen
            angosto
            telefono="detalle"
            etiquetaLista="Índice de configuración"
            etiquetaDetalle={titulo}
            lista={<IndiceConfig indice={indice} seleccionada={seccion} />}
            detalle={
              <div className="flex w-full max-w-[960px] flex-col">
                <Cabecera
                  titulo={titulo}
                  tituloSiempre
                  tituloDetalle
                  {...(c.subtitulo ? { subtitulo: c.subtitulo } : {})}
                  {...(c.acciones ? { acciones: c.acciones } : {})}
                />
                {children(datos, indice)}
              </div>
            }
          />
        );
      }}
    </PaginaPortal>
  );
}
