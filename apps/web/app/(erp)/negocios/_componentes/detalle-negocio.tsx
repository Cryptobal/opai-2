import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";

import type { cargarNegocio, NegocioDetalle } from "./datos";
import { FichaNegocio, type TabNegocio } from "./ficha-negocio";

type Props = {
  datos: ReturnType<typeof cargarNegocio>;
  p: Parametros;
  tab: TabNegocio;
  children: (negocio: NegocioDetalle, p: Parametros) => ReactNode;
};

/** Panel derecho de un negocio: carga sus datos dentro de su Suspense (la lista no espera por él). */
export async function DetalleNegocio({ datos, p, tab, children }: Props) {
  const ficha = await datos;
  return (
    <FichaNegocio state={ficha.state} negocio={ficha.negocio} tab={tab}>
      {ficha.negocio ? children(ficha.negocio, p) : null}
    </FichaNegocio>
  );
}
