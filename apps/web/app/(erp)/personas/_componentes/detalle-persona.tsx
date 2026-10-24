import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { cargarPersona } from "./datos";
import { HojaPersona } from "./diferidas";
import { FichaPersona, type TabPersona } from "./ficha-persona";
import { conParametros } from "./lista-personas";

type Props = {
  id: string;
  p: Parametros;
  tab: TabPersona;
  children: (persona: PersonaDetalle, p: Parametros) => ReactNode | Promise<ReactNode>;
};

/**
 * Panel derecho de una persona. Carga sus propios datos (ficha y contenido de la pestaña) para que
 * `PaginaPersona` lo envuelva en un Suspense: mientras llegan, solo este panel muestra el esqueleto
 * y la lista de la izquierda ya está en pantalla.
 */
export async function DetallePersona({ id, p, tab, children }: Props) {
  const d = await cargarPersona(id);
  const contenido = d.persona ? await children(d.persona, p) : null;
  return (
    <>
      <FichaPersona state={d.state} persona={d.persona} tab={tab} consulta={conParametros(p)}>
        {contenido}
      </FichaPersona>
      {d.persona ? <HojaPersona persona={d.persona} /> : null}
    </>
  );
}
