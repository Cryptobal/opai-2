import { Plus } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type Parametros, type SearchParams } from "@/lib/parametros";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { cargarCuenta, cargarCuentas, filtrosDe } from "./datos";
import { DetalleCuenta } from "./detalle-cuenta";
import { HojaCuenta } from "./diferidas";
import type { TabCuenta } from "./ficha-cuenta";
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
      volverSoloTelefono
      volverBajoLg
      acciones={
        acciones ?? (
          <EnlaceBoton href="/cuentas?nueva=1" icono={Plus} className="max-lg:hidden">
            Nueva cuenta
          </EnlaceBoton>
        )
      }
      opciones={(d) => ({ volver: { href: conBusqueda("/cuentas", d.p.q), etiqueta: "Cuentas" } })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, filtrosDe(searchParams)]);
        // Solo la lista se espera aquí: la ficha arranca en paralelo y se espera dentro de su propio Suspense.
        const datos = cargarCuenta(id);
        datos.catch(() => undefined); // si la lista falla, la promesa no queda sin manejar
        return { id, p, datos, lista: await cargarCuentas(p) };
      }}
    >
      {({ id, p, datos, lista }) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de cuentas"
            lista={
              <ListaCuentas
                state={lista.state}
                items={lista.items}
                seleccionada={id}
                q={p.q}
                etiquetas={lista.etiquetas}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetalleCuenta datos={datos} p={p} tab={tab}>
                  {children}
                </DetalleCuenta>
              </Suspense>
            }
          />
          <HojaCuenta />
        </>
      )}
    </PaginaPortal>
  );
}
