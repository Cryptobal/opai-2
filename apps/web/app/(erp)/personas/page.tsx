import { CalendarClock, Plus } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { hoyIso } from "@/lib/fechas";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarPersonas } from "./_componentes/datos";
import { HojaPersona } from "./_componentes/hoja-persona";
import { ListaPersonas } from "./_componentes/lista-personas";
import { SegmentoPersonas } from "./_componentes/segmento";

export const metadata = { title: "Personas" };

/** Personas (10, 53, 54): tabla con búsqueda instantánea y filtros; lista por letra en teléfono. */
export default function Personas({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Personas"
      ruta="/personas"
      acciones={
        <>
          <EnlaceBoton href="/personas/vencimientos" variante="secondary" icono={CalendarClock}>
            Vencimientos
          </EnlaceBoton>
          <EnlaceBoton href="?nueva=1" icono={Plus}>
            Nueva persona
          </EnlaceBoton>
        </>
      }
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
        titulo: d.voc.titulo("persona"),
        insignia: <SegmentoPersonas activa="personas" plural="Personas" />,
      })}
    >
      {(d) => (
        <>
          <ListaPersonas
            state={d.state}
            items={d.items}
            cargos={d.cargos}
            siguiente={d.siguiente}
            total={d.total}
            p={d.p}
            titulo={d.voc.titulo("persona")}
          />
          <HojaPersona cargos={d.cargos} hoy={hoyIso()} />
        </>
      )}
    </PaginaPortal>
  );
}
