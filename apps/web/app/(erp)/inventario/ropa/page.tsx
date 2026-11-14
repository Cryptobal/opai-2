import { Shirt } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarRopa } from "../_componentes/datos-ropa";
import { ListaRopa } from "../_componentes/lista-ropa";

export const metadata = { title: "Ropa" };

/** Inventario › Ropa (CAR-237): cada tipo de ropa con sus existencias por talla. */
export default function Ropa({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargar={async () => {
        const [p] = await Promise.all([leerParametros(searchParams), requerirIdentidad("/inventario/ropa")]);
        return { ...(await cargarRopa(p)), q: p.q };
      }}
    >
      {(d) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de ropa"
          vacio={{ texto: "Elige una prenda", icono: Shirt }}
          lista={<ListaRopa state={d.state} items={d.items} {...(d.q ? { q: d.q } : {})} />}
        />
      )}
    </PaginaPortal>
  );
}
