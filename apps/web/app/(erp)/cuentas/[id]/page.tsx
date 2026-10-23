import { Plus } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarCuenta, cargarCuentas, filtrosDe } from "../_componentes/datos";
import { FichaCuenta } from "../_componentes/ficha-cuenta";
import { HojaCuenta } from "../_componentes/hoja-cuenta";
import { ListaCuentas } from "../_componentes/lista-cuentas";
import { ResumenCuenta } from "../_componentes/resumen-cuenta";

export const metadata = { title: "Cuenta" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
};

/** Cuenta · Resumen dentro de la vista dividida (01); en teléfono, el detalle con "Atrás" (04). */
export default function Cuenta({ params, searchParams }: Props) {
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
        <EnlaceBoton href="/cuentas?nueva=1" icono={Plus}>
          Nueva cuenta
        </EnlaceBoton>
      }
      cargar={async () => {
        const [{ id }, filtros] = await Promise.all([params, filtrosDe(searchParams)]);
        const [lista, ficha] = await Promise.all([cargarCuentas(filtros), cargarCuenta(id)]);
        return { id, lista, ficha };
      }}
    >
      {({ id, lista, ficha }) => (
        <>
          <SplitScreen
            telefono="detalle"
            etiquetaLista="Lista de cuentas"
            lista={<ListaCuentas state={lista.state} items={lista.items} seleccionada={id} />}
            detalle={
              <FichaCuenta state={ficha.state} cuenta={ficha.cuenta} tab="resumen">
                {ficha.cuenta ? <ResumenCuenta c={ficha.cuenta} /> : null}
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
