import { Users } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarPersonas } from "./_componentes/datos";
import { HojaPersona } from "./_componentes/diferidas";
import { ListaPersonas } from "./_componentes/lista-personas";
import { SegmentoPersonas } from "./_componentes/segmento";

export const metadata = { title: "Personas" };

/** Personas (10, 53): vista dividida con lista a la izquierda y "Elige una persona"; lista en teléfono. */
export default function Personas({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Personas"
      ruta="/personas"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return { ...(await cargarPersonas(p)), p };
      }}
      opciones={() => ({
        titulo: "Personas",
        insignia: <SegmentoPersonas activa="personas" plural="Personas" />,
      })}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de personas"
            vacio={{ texto: "Elige una persona", icono: Users }}
            lista={
              <ListaPersonas
                state={d.state}
                items={d.items}
                cargos={d.cargos}
                siguiente={d.siguiente}
                total={d.total}
                p={d.p}
                titulo="Personas"
              />
            }
          />
          <HojaPersona cargos={d.cargos} hoy={hoyIso()} />
        </>
      )}
    </PaginaPortal>
  );
}
