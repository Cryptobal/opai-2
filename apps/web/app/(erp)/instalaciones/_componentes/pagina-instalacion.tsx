import type { ReactNode } from "react";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarInstalacion } from "./datos";
import { FichaInstalacion, type TabInstalacion } from "./ficha-instalacion";
import { HojaInstalacion } from "./diferidas";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabInstalacion;
  acciones?: ReactNode;
  children: (i: InstalacionDetalle, p: Parametros) => ReactNode;
};

/** Tabs de una instalación a ancho completo: migas y ficha. */
export function PaginaInstalacion({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Instalación"
      ruta="/instalaciones"
      cargando="detalle"
      volver={{ href: "/instalaciones", etiqueta: "Instalaciones" }}
      {...(acciones ? { acciones } : {})}
      cargar={async () => {
        const [{ id }, p, voc] = await Promise.all([
          params,
          leerParametros(searchParams),
          vocabularioActual(),
        ]);
        return { ...(await cargarInstalacion(id)), p, voc };
      }}
      opciones={(d) => ({
        titulo: d.instalacion?.nombre ?? "Instalación",
        volver: { href: "/instalaciones", etiqueta: d.voc.titulo("instalacion") },
      })}
    >
      {(d) => (
        <>
          <FichaInstalacion
            state={d.state}
            instalacion={d.instalacion}
            tab={tab}
            persona={d.voc.titulo("persona")}
          >
            {d.instalacion ? children(d.instalacion, d.p) : null}
          </FichaInstalacion>
          {d.instalacion ? <HojaInstalacion instalacion={d.instalacion} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
