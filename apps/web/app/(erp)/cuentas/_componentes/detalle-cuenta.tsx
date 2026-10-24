import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { cargarCuenta } from "./datos";
import { HojaCuenta } from "./diferidas";
import { FichaCuenta, type TabCuenta } from "./ficha-cuenta";

type Props = {
  id: string;
  p: Parametros;
  tab: TabCuenta;
  children: (cuenta: CuentaDetalle, p: Parametros) => ReactNode;
};

/** Panel derecho de una cuenta: carga sus datos dentro de su Suspense (la lista no espera por él). */
export async function DetalleCuenta({ id, p, tab, children }: Props) {
  const ficha = await cargarCuenta(id);
  return (
    <>
      <FichaCuenta state={ficha.state} cuenta={ficha.cuenta} tab={tab}>
        {ficha.cuenta ? children(ficha.cuenta, p) : null}
      </FichaCuenta>
      {ficha.cuenta ? <HojaCuenta cuenta={ficha.cuenta} /> : null}
    </>
  );
}
