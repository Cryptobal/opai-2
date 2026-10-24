import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

import type { cargarInstalacion } from "./datos";
import { HojaInstalacion } from "./diferidas";
import { FichaInstalacion, type TabInstalacion } from "./ficha-instalacion";

type Props = {
  /** Carga de la ficha, iniciada en paralelo con la de la lista. */
  datos: ReturnType<typeof cargarInstalacion>;
  p: Parametros;
  tab: TabInstalacion;
  /** Nombre en plural de las personas según la vertical (vocabulario del tenant). */
  persona: string;
  children: (i: InstalacionDetalle, p: Parametros) => ReactNode;
};

/** Panel derecho de una instalación: carga sus datos dentro de su Suspense (la lista no espera por él). */
export async function DetalleInstalacion({ datos, p, tab, persona, children }: Props) {
  const ficha = await datos;
  return (
    <>
      <FichaInstalacion
        state={ficha.state}
        instalacion={ficha.instalacion}
        tab={tab}
        persona={persona}
      >
        {ficha.instalacion ? children(ficha.instalacion, p) : null}
      </FichaInstalacion>
      {ficha.instalacion ? <HojaInstalacion instalacion={ficha.instalacion} /> : null}
    </>
  );
}
