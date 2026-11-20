import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import type { Parametros } from "@/lib/parametros";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import type { cargarPersona } from "./datos";
import { HojaPersona } from "./diferidas";
import { FichaPersona, type TabPersona } from "./ficha-persona";
import { verPestanaTurnosExtra } from "@/lib/pestanas-modulos";

import { conParametros } from "./lista-personas";

type Props = {
  panel?: PanelSueldo | undefined;
  /** Carga de la ficha, iniciada en paralelo con la de la lista. */
  datos: ReturnType<typeof cargarPersona>;
  p: Parametros;
  tab: TabPersona;
  children: (persona: PersonaDetalle, p: Parametros) => ReactNode | Promise<ReactNode>;
};

/**
 * Panel derecho de una persona. Carga sus propios datos (ficha y contenido de la pestaña) para que
 * `PaginaPersona` lo envuelva en un Suspense: mientras llegan, solo este panel muestra el esqueleto
 * y la lista de la izquierda ya está en pantalla.
 */
export async function DetallePersona({ datos, p, tab, children, panel }: Props) {
  const [d, turnosExtra] = await Promise.all([datos, verPestanaTurnosExtra()]);
  const contenido = d.persona ? await children(d.persona, p) : null;
  return (
    <>
      <FichaPersona
        {...(panel ? { aprobaciones: panel.aprobaciones } : {})}
        state={d.state}
        persona={d.persona}
        tab={tab}
        consulta={conParametros(p)}
        turnosExtra={turnosExtra}
      >
        {contenido}
      </FichaPersona>
      {d.persona ? <HojaPersona persona={d.persona} /> : null}
    </>
  );
}
