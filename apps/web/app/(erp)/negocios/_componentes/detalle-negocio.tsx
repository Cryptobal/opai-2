import type { ReactNode } from "react";

import { accesoCpq } from "@/lib/cpq-ui";
import { identidadActual } from "@/lib/servidor";

import type { Parametros } from "@/lib/parametros";
import { puedeGestionarNegocios } from "@/lib/pestanas-modulos";

import { type cargarNegocio, cargarEtapasActivas, type NegocioDetalle } from "./datos";
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
  // Sin comercial:negocios.manage no se cargan ni montan hojas (aunque la URL traiga ?ganar=1).
  const [gestiona, cpq] = await Promise.all([
    puedeGestionarNegocios(),
    identidadActual().then(accesoCpq),
  ]);
  const n = ficha.negocio;
  const movible = gestiona && n?.estado === "abierto" && !n.archivadoEn;
  const [hojas, etapas] = await Promise.all([
    gestiona && n ? cargarHojas(p, n) : null,
    movible ? cargarEtapasActivas() : null,
  ]);
  return (
    <>
      <FichaNegocio
        state={ficha.state}
        negocio={ficha.negocio}
        tab={tab}
        gestiona={gestiona}
        cpq={cpq}
        etapas={etapas}
      >
        {ficha.negocio ? children(ficha.negocio, p) : null}
      </FichaNegocio>
      <HojasNegocio h={hojas} />
    </>
  );
}
