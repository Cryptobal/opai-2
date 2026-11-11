import { Plus } from "lucide-react";

import { Empty, FilaSeleccionable, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { LinkNext } from "@/app/_components/link-next";

import { contarMiembros, type GrupoVista } from "./tipos";

/** Pestaña Grupos: grupos o equipos vigentes, con su número de miembros. */
export function GruposLista({ grupos, gestiona }: { grupos: GrupoVista[]; gestiona: boolean }) {
  return (
    <SeccionTarjeta titulo="Grupos y equipos" sinRelleno>
      {grupos.length ? (
        <ul aria-label="Grupos de la empresa">
          {grupos.map((g) => (
            <li key={g.id}>
              <FilaSeleccionable
                href={`?grupo=${encodeURIComponent(g.id)}`}
                Link={LinkNext}
                titulo={g.nombre}
                secundario={g.descripcion ?? undefined}
                fin={
                  <span className="t-caption whitespace-nowrap">{contarMiembros(g.miembros)}</span>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          titulo="Aún no hay grupos"
          descripcion="Agrupa a las personas que trabajan juntas, por ejemplo quienes revisan cotizaciones. Más adelante podrás nombrar un grupo como aprobador."
          {...(gestiona
            ? {
                accion: (
                  <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
                    Nuevo grupo
                  </EnlaceBotonHoja>
                ),
              }
            : {})}
        />
      )}
    </SeccionTarjeta>
  );
}
