import { MapPin } from "lucide-react";

import { Estado, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { instalacionesActivas } from "../_componentes/datos";

export const metadata = { title: "Instalaciones" };

/** Instalaciones activas para el supervisor en terreno. */
export default function InstalacionesTerreno() {
  return (
    <PaginaPortal
      portal="supervisor"
      titulo="Instalaciones"
      ruta="/supervisor/instalaciones"
      cargar={instalacionesActivas}
    >
      {({ state, items }) => (
        <div className="flex flex-col gap-3">
          <h2 className="t-title text-fg md:hidden">Instalaciones</h2>
          <Estado
            state={state === "ready" && items.length === 0 ? "empty" : state}
            variante="lista"
            textos={{ vacio: { titulo: "Sin instalaciones activas" } }}
          >
            <div className="-mx-4 border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
              {items.map((i) => (
                <FilaSeleccionable
                  key={i.id}
                  href={`/supervisor/instalaciones/${i.id}`}
                  Link={LinkNext}
                  inicio={
                    <span
                      aria-hidden
                      className="flex size-9 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted"
                    >
                      <MapPin className="size-4" />
                    </span>
                  }
                  titulo={i.nombre}
                  secundario={[i.cuenta, i.comuna].filter(Boolean).join(" · ")}
                />
              ))}
            </div>
          </Estado>
        </div>
      )}
    </PaginaPortal>
  );
}
