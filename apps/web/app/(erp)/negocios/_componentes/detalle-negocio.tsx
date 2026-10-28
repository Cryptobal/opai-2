import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import { puedeGestionarNegocios } from "@/lib/pestanas-modulos";

import type { cargarNegocio, NegocioDetalle } from "./datos";
import { FichaNegocio, type TabNegocio } from "./ficha-negocio";
import { cargarHojas } from "./hojas/datos-hojas";
import { HojasNegocio } from "./hojas/hojas-negocio";

type Props = {
  datos: ReturnType<typeof cargarNegocio>;
  p: Parametros;
  tab: TabNegocio;
  children: (negocio: NegocioDetalle, p: Parametros) => ReactNode;
};

/** Panel derecho de un negocio: carga sus datos dentro de su Suspense (la lista no espera por él) y monta sus hojas. */
export async function DetalleNegocio({ datos, p, tab, children }: Props) {
  const ficha = await datos;
  // Hojas de la ficha (editar, ganar, perder, reabrir, vínculos): sus datos solo con una abierta.
  const [hojas, gestiona] = await Promise.all([
    ficha.negocio ? cargarHojas(p, ficha.negocio) : null,
    puedeGestionarNegocios(),
  ]);
  return (
    <>
      <FichaNegocio state={ficha.state} negocio={ficha.negocio} tab={tab} gestiona={gestiona}>
        {ficha.negocio ? children(ficha.negocio, p) : null}
      </FichaNegocio>
      <HojasNegocio h={hojas} />
    </>
  );
}
