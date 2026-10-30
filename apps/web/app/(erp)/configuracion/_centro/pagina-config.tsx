import type { ReactNode } from "react";

import { Cabecera, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarIndice, grupoDeSeccion, type Indice } from "./datos";
import { ListaGrupo } from "./lista-grupo";
import { Migas } from "./migas";

type Cab = { subtitulo?: ReactNode; acciones?: ReactNode };

type Props<T> = {
  /** Id de la sección (resalta la lista); puede depender de los datos (módulo activo). */
  seccion: string | ((datos: T) => string);
  titulo: string | ((datos: T) => string);
  cargar?: () => Promise<T>;
  /** Subtítulo y acción principal de la sección (dependen de los datos). */
  cabecera?: (datos: T, indice: Indice) => Cab;
  children: (datos: T, indice: Indice) => ReactNode;
};

/**
 * Entrada del centro de Configuración: a la izquierda (iPad y escritorio) solo las entradas del
 * grupo de la entrada abierta (REGLA §1, brief §4.2), con migas «Configuración › <Grupo>» sobre su
 * título; a la derecha la entrada con su título y acción. En teléfono, la entrada con «‹ <Grupo>».
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
      volverSoloTelefono
      cargar={async () => {
        const [indice, datos] = await Promise.all([cargarIndice(), cargar ? cargar() : undefined]);
        return { indice, datos: datos as T };
      }}
      opciones={({ datos }) => {
        const sel = typeof seccion === "function" ? seccion(datos) : seccion;
        const grupo = grupoDeSeccion(sel);
        return grupo
          ? { volver: { href: `/configuracion/grupo/${grupo.id}`, etiqueta: grupo.etiqueta } }
          : {};
      }}
    >
      {({ indice, datos }) => {
        const c = cabecera?.(datos, indice) ?? {};
        const t = typeof titulo === "function" ? titulo(datos) : titulo;
        const sel = typeof seccion === "function" ? seccion(datos) : seccion;
        const grupo = grupoDeSeccion(sel);
        const entradas = grupo ? indice.secciones.filter((s) => s.grupo === grupo.id) : [];
        return (
          <SplitScreen
            telefono="detalle"
            etiquetaLista="Entradas del grupo"
            etiquetaDetalle={t}
            lista={
              grupo ? (
                <ListaGrupo
                  etiqueta={grupo.etiqueta}
                  entradas={entradas}
                  aprobaciones={indice.aprobaciones}
                  seleccionada={sel}
                />
              ) : null
            }
            detalle={
              <div className="flex w-full max-w-[960px] flex-col">
                <Cabecera
                  titulo={t}
                  tituloSiempre
                  tituloDetalle
                  {...(grupo ? { sobre: <Migas grupo={grupo} /> } : {})}
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
