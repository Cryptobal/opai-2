import { Empty } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

/**
 * Terreno con sesión no es el equipo de la instalación: ese corre sin sesión, emparejado.
 * Los dispositivos se gestionan en la ficha (`/instalaciones/[id]/dispositivos`).
 */
export function AvisoTerrenoConSesion({ puedeDispositivos }: { puedeDispositivos: boolean }) {
  return (
    <>
      <h2 className="t-title mb-4 text-fg md:hidden">Terreno</h2>
      <Empty
        titulo="Terreno va en el equipo emparejado"
        descripcion="Terreno se usa en el teléfono o la tablet de la instalación, en el equipo emparejado."
        accion={
          <div className="flex flex-col items-center gap-3">
            {puedeDispositivos ? (
              <EnlaceBoton href="/instalaciones">Dispositivos de instalaciones</EnlaceBoton>
            ) : null}
            <LinkNext href="/terreno/emparejar" className="text-sm font-medium text-accent">
              Emparejar este teléfono
            </LinkNext>
          </div>
        }
      />
    </>
  );
}
