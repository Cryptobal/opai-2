import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { Parametros, SearchParams } from "@/lib/parametros";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { cargarCuenta, cargarCuentas, filtrosDe } from "./datos";
import { HojaCuenta } from "./diferidas";
import { FichaCuenta, type TabCuenta } from "./ficha-cuenta";
import { ListaCuentas } from "./lista-cuentas";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabCuenta;
  /** Acción principal de la pestaña; por defecto, "Nueva cuenta". */
  acciones?: ReactNode;
  children: (cuenta: CuentaDetalle, p: Parametros) => ReactNode;
};

/** Toda pestaña de una cuenta (01-05): la lista a la izquierda y la ficha a la derecha; en teléfono, el detalle con "Atrás". */
export function PaginaCuenta({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cuentas"
      ruta="/cuentas"
      completo
      cargando="detalle"
      volver={{ href: "/cuentas", etiqueta: "Cuentas" }}
      volverSoloTelefono
      acciones={
        acciones ?? (
          <EnlaceBoton href="/cuentas?nueva=1" icono={Plus}>
            Nueva cuenta
          </EnlaceBoton>
        )
      }
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, filtrosDe(searchParams)]);
        const [lista, ficha] = await Promise.all([cargarCuentas(p), cargarCuenta(id)]);
        return { id, p, lista, ficha };
      }}
    >
      {({ id, p, lista, ficha }) => (
        <>
          <SplitScreen
            telefono="detalle"
            etiquetaLista="Lista de cuentas"
            lista={<ListaCuentas state={lista.state} items={lista.items} seleccionada={id} />}
            detalle={
              <FichaCuenta state={ficha.state} cuenta={ficha.cuenta} tab={tab}>
                {ficha.cuenta ? children(ficha.cuenta, p) : null}
              </FichaCuenta>
            }
          />
          {ficha.cuenta ? <HojaCuenta cuenta={ficha.cuenta} /> : null}
          <HojaCuenta />
        </>
      )}
    </PaginaPortal>
  );
}
