import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { PersonaDetalle } from "@/lib/tipos-maestros";
import { hoyIso } from "@/lib/fechas";

import { cargarPersona, cargarPersonas } from "./datos";
import { HojaPersona } from "./diferidas";
import { FichaPersona, type TabPersona } from "./ficha-persona";
import { ListaPersonas } from "./lista-personas";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabPersona;
  /** Acción principal de la pestaña; por defecto, "Editar". */
  acciones?: ReactNode;
  children: (persona: PersonaDetalle, p: Parametros) => ReactNode | Promise<ReactNode>;
};

/** Toda pestaña de una persona (11-18): la lista a la izquierda y la ficha a la derecha; en teléfono, el detalle con "Atrás". */
export function PaginaPersona({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Personas"
      ruta="/personas"
      completo
      cargando="detalle"
      volverSoloTelefono
      acciones={
        acciones ?? (
          <EnlaceBotonHoja href="?editar=1" icono={Pencil}>
            Editar
          </EnlaceBotonHoja>
        )
      }
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const [lista, d] = await Promise.all([cargarPersonas(p), cargarPersona(id)]);
        return { id, p, lista, ...d, contenido: d.persona ? await children(d.persona, p) : null };
      }}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="detalle"
            etiquetaLista="Lista de personas"
            lista={
              <ListaPersonas
                state={d.lista.state}
                items={d.lista.items}
                cargos={d.lista.cargos}
                siguiente={d.lista.siguiente}
                total={d.lista.total}
                p={d.p}
                titulo="Personas"
                seleccionada={d.id}
              />
            }
            detalle={
              <FichaPersona state={d.state} persona={d.persona} tab={tab}>
                {d.contenido}
              </FichaPersona>
            }
          />
          {d.persona ? <HojaPersona persona={d.persona} /> : null}
          <HojaPersona cargos={d.lista.cargos} hoy={hoyIso()} />
        </>
      )}
    </PaginaPortal>
  );
}
