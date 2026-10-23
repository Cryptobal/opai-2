import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { PersonaDetalle } from "@/lib/tipos-maestros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarPersona } from "./datos";
import { FichaPersona, type TabPersona } from "./ficha-persona";
import { HojaPersona } from "./diferidas";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabPersona;
  /** Acción principal de la pestaña; por defecto, "Editar". */
  acciones?: ReactNode;
  children: (persona: PersonaDetalle, p: Parametros) => ReactNode | Promise<ReactNode>;
};

/** Pestañas de una persona a ancho completo: migas "<Personas> / <nombre>" y la ficha. */
export function PaginaPersona({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Persona"
      ruta="/personas"
      cargando="detalle"
      volver={{ href: "/personas", etiqueta: "Personas" }}
      acciones={
        acciones ?? (
          <EnlaceBoton href="?editar=1" icono={Pencil}>
            Editar
          </EnlaceBoton>
        )
      }
      cargar={async () => {
        const [{ id }, p, voc] = await Promise.all([
          params,
          leerParametros(searchParams),
          vocabularioActual(),
        ]);
        const d = await cargarPersona(id);
        return { ...d, p, voc, contenido: d.persona ? await children(d.persona, p) : null };
      }}
      opciones={(d) => ({
        titulo: d.persona?.nombreCompleto ?? "Persona",
        volver: { href: "/personas", etiqueta: d.voc.titulo("persona") },
      })}
    >
      {(d) => (
        <>
          <FichaPersona state={d.state} persona={d.persona} tab={tab}>
            {d.contenido}
          </FichaPersona>
          {d.persona ? <HojaPersona persona={d.persona} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
