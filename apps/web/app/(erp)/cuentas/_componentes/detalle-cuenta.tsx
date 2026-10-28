import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import { verPestanaNegocios } from "@/lib/pestanas-modulos";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import type { cargarCuenta } from "./datos";
import { HojaCuenta } from "./diferidas";
import { FichaCuenta, type TabCuenta } from "./ficha-cuenta";

type Props = {
  /** Carga de la ficha, iniciada en paralelo con la de la lista. */
  datos: ReturnType<typeof cargarCuenta>;
  p: Parametros;
  tab: TabCuenta;
  children: (cuenta: CuentaDetalle, p: Parametros) => ReactNode;
};

/** Panel derecho de una cuenta: carga sus datos dentro de su Suspense (la lista no espera por él). */
export async function DetalleCuenta({ datos, p, tab, children }: Props) {
  const [ficha, negocios] = await Promise.all([datos, verPestanaNegocios()]);
  return (
    <>
      <FichaCuenta state={ficha.state} cuenta={ficha.cuenta} tab={tab} negocios={negocios}>
        {ficha.cuenta ? children(ficha.cuenta, p) : null}
      </FichaCuenta>
      {ficha.cuenta ? <HojaCuenta cuenta={ficha.cuenta} /> : null}
    </>
  );
}
