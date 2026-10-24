import { CalendarClock, Plus } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { hoyIso } from "@/lib/fechas";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarPersonas } from "./_componentes/datos";
import { HojaPersona } from "./_componentes/diferidas";
import { ListaPersonas } from "./_componentes/lista-personas";
import { SegmentoPersonas, SegmentoPersonasMovil } from "./_componentes/segmento";

export const metadata = { title: "Personas" };

/** Personas (10, 53, 54): tabla con búsqueda instantánea y filtros; lista por letra en teléfono. */
export default function Personas({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Personas"
      ruta="/personas"
      accionesTelefono={
        <EnlaceBoton
          href="/personas/vencimientos"
          variante="ghost"
          icono={CalendarClock}
          etiqueta="Vencimientos"
        >
          {null}
        </EnlaceBoton>
      }
      cargar={async () => {
        const [p, voc] = await Promise.all([leerParametros(searchParams), vocabularioActual()]);
        return { ...(await cargarPersonas(p)), p, voc };
      }}
      opciones={(d) => ({
        titulo: "Personas",
        insignia: <SegmentoPersonas activa="personas" plural="Personas" />,
        acciones: (
          <>
            <EnlaceBotonHoja href="?nueva=1" icono={Plus}>
              Agregar {d.voc.persona.singular}
            </EnlaceBotonHoja>
          </>
        ),
      })}
    >
      {(d) => (
        <>
          <SegmentoPersonasMovil activa="personas" />
          <ListaPersonas
            state={d.state}
            items={d.items}
            cargos={d.cargos}
            siguiente={d.siguiente}
            total={d.total}
            p={d.p}
            titulo="Personas"
          />
          <HojaPersona cargos={d.cargos} hoy={hoyIso()} termino={d.voc.persona.singular} />
        </>
      )}
    </PaginaPortal>
  );
}
