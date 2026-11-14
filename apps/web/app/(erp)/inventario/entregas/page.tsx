import { HandCoins } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarEntregas, cargarOpcionesEntrega } from "../_componentes/datos-entregas";
import { HojaDevolver, HojaEntrega } from "../_componentes/diferidas";
import { ListaEntregas } from "../_componentes/lista-entregas";
import { contextoPagina } from "../_componentes/paginas";

export const metadata = { title: "Entregas" };

/** Inventario › Entregas (CAR-238): qué tiene cada persona o instalación, entregar y devolver. */
export default function Entregas({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargar={async () => {
        const { p, puede: puedeGestionar } = await contextoPagina(searchParams, "/inventario/entregas", "inventario:gestionar");
        // Las opciones de la hoja solo se cargan con la hoja abierta (consultas por navegación, ADR-045).
        const opciones = puedeGestionar && p["nueva"] ? await cargarOpcionesEntrega() : null;
        return { ...(await cargarEntregas(p)), puedeGestionar, opciones };
      }}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de entregas"
            vacio={{ texto: "Toca una entrega abierta para registrar su devolución", icono: HandCoins }}
            lista={<ListaEntregas state={d.state} items={d.items} puedeGestionar={d.puedeGestionar} />}
          />
          {d.opciones ? <HojaEntrega opciones={d.opciones} /> : null}
          {d.puedeGestionar ? <HojaDevolver entregas={d.items.filter((x) => x.devueltaEn === null)} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
