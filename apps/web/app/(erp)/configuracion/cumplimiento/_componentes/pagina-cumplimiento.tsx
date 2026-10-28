import type { ReactNode } from "react";

import { Segmentado } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { construirPuede } from "@/lib/permisos-ui";

import { PaginaConfig } from "../../_centro/pagina-config";

export type Pestana = "resumen" | "solicitudes" | "incidentes" | "retencion";

const PESTANAS: readonly { id: Pestana; etiqueta: string; href: string }[] = [
  { id: "resumen", etiqueta: "Resumen", href: "/configuracion/cumplimiento" },
  { id: "solicitudes", etiqueta: "Solicitudes", href: "/configuracion/cumplimiento/solicitudes" },
  { id: "incidentes", etiqueta: "Incidentes", href: "/configuracion/cumplimiento/incidentes" },
  { id: "retencion", etiqueta: "Retención", href: "/configuracion/cumplimiento/retencion" },
];

/** Qué puede hacer el usuario en Cumplimiento (permisos efectivos, ADR-022). */
export type PuedeCumplimiento = { gestionar: boolean; aceptarDpa: boolean };

type Props<T> = {
  pestana: Pestana;
  cargar: () => Promise<T>;
  acciones?: (datos: T, puede: PuedeCumplimiento) => ReactNode;
  children: (datos: T, puede: PuedeCumplimiento) => ReactNode;
};

/**
 * Configuración → Datos personales (Ley 21.719, Brief 07d bloques 7-UI y 8): pestañas por ruta
 * (server-first) sobre la sección del centro de Configuración. Las escrituras son `soloPersonas`:
 * esta pantalla es la única vía para ejecutarlas (un agente no acepta el DPA ni resuelve solicitudes).
 */
export function PaginaCumplimiento<T>({ pestana, cargar, acciones, children }: Props<T>) {
  return (
    <PaginaConfig
      seccion="cumplimiento"
      titulo="Datos personales"
      cargar={cargar}
      cabecera={(d, indice) => {
        const a = acciones?.(d, puedeDe(indice));
        return { subtitulo: "Ley 21.719", ...(a ? { acciones: a } : {}) };
      }}
    >
      {(d, indice) => (
        <div className="flex flex-col gap-4">
          <Segmentado
            etiqueta="Secciones de datos personales"
            activa={pestana}
            Link={LinkNext}
            className="max-w-full self-start overflow-x-auto"
            opciones={PESTANAS}
          />
          {children(d, puedeDe(indice))}
        </div>
      )}
    </PaginaConfig>
  );
}

function puedeDe(indice: { rol: string | null; acceso: Parameters<typeof construirPuede>[1] }) {
  const puede = construirPuede(indice.rol, indice.acceso);
  return {
    gestionar: puede(PERMISOS_CORE.cumplimientoManage),
    // Aceptar el DPA es acto exclusivo del owner (§16.1); la capacidad además exige el rol.
    aceptarDpa: indice.rol === "owner" && puede(PERMISOS_CORE.cumplimientoDpaAceptar),
  };
}
