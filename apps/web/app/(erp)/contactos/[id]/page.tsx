import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type SearchParams } from "@/lib/parametros";

import { cargarContacto, cargarContactos, filtrosDe } from "../_componentes/datos";
import { DetalleContacto } from "../_componentes/detalle-contacto";
import { ListaContactosSplit } from "../_componentes/lista-contactos-split";

export const metadata = { title: "Contacto" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Ficha de un contacto dentro de la vista dividida; en teléfono, el detalle con "Atrás". */
export default function Contacto({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Contactos"
      ruta="/contactos"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      opciones={(d) => ({ volver: { href: conBusqueda("/contactos", d.p.q), etiqueta: "Contactos" } })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, filtrosDe(searchParams)]);
        const datos = cargarContacto(id);
        datos.catch(() => undefined);
        return { id, p, datos, lista: await cargarContactos(p) };
      }}
    >
      {({ id, p, datos, lista }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de contactos"
          lista={
            <ListaContactosSplit state={lista.state} items={lista.items} seleccionado={id} q={p.q} />
          }
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleContacto datos={datos} />
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}
