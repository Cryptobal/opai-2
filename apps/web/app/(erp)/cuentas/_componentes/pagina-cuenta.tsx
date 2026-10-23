import type { ReactNode } from "react";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { cargarCuenta } from "./datos";
import { FichaCuenta, type TabCuenta } from "./ficha-cuenta";
import { HojaCuenta } from "./diferidas";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabCuenta;
  acciones?: ReactNode;
  children: (cuenta: CuentaDetalle, p: Parametros) => ReactNode;
};

/** Tabs de una cuenta a ancho completo (03): migas "Cuentas / <nombre>" y la ficha. */
export function PaginaCuenta({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cuenta"
      ruta="/cuentas"
      cargando="detalle"
      volver={{ href: "/cuentas", etiqueta: "Cuentas" }}
      {...(acciones ? { acciones } : {})}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        return { ...(await cargarCuenta(id)), p };
      }}
      opciones={(d) => ({ titulo: d.cuenta?.nombre ?? "Cuenta" })}
    >
      {(d) => (
        <>
          <FichaCuenta state={d.state} cuenta={d.cuenta} tab={tab}>
            {d.cuenta ? children(d.cuenta, d.p) : null}
          </FichaCuenta>
          {d.cuenta ? <HojaCuenta cuenta={d.cuenta} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
