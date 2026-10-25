import { Building2, Plus } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarCuentas, filtrosDe } from "./_componentes/datos";
import { HojaCuenta } from "./_componentes/diferidas";
import { ListaCuentas } from "./_componentes/lista-cuentas";

export const metadata = { title: "Cuentas" };

type Props = { searchParams: SearchParams };

/** Cuentas (01/02): vista dividida en md+ con "Elige una cuenta"; lista en teléfono. */
export default function Cuentas({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cuentas"
      ruta="/cuentas"
      completo
      acciones={
        <EnlaceBotonHoja href="/cuentas?nueva=1" icono={Plus}>
          Nueva cuenta
        </EnlaceBotonHoja>
      }
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        return { ...(await cargarCuentas(p)), q: p.q };
      }}
    >
      {(l) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de cuentas"
            vacio={{ texto: "Elige una cuenta", icono: Building2 }}
            lista={<ListaCuentas state={l.state} items={l.items} q={l.q} />}
          />
          <HojaCuenta />
        </>
      )}
    </PaginaPortal>
  );
}
