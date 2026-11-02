"use client";

import { AreaGrupo } from "./area-grupo";
import { agrupar, EntradaArea, Item } from "./sidebar-item";
import { esActivo, type LinkComponent, type NavItem } from "./types";

type Props = {
  items: readonly NavItem[];
  rutaActual: string;
  Link: LinkComponent;
  abierto: string | null;
  alternar: (grupo: string, area: string | undefined) => void;
  pinDe: (item: NavItem) => { onFijar?: () => void; fijado?: boolean };
};

/** Lista de áreas del sidebar desktop: sueltas, una entrada o acordeón (D1). */
export function SidebarAreas({ items, rutaActual, Link, abierto, alternar, pinDe }: Props) {
  const grupos = agrupar(items.filter((i) => !i.pie));
  return (
    <div className="flex-1 overflow-y-auto pt-2 pb-6">
      {grupos
        .filter((i) => !i[1].some((x) => x.soloCompacto))
        .map(([grupo, lista]) => {
          if (!grupo) {
            return (
              <div key="suelto" className="flex flex-col gap-px px-3">
                {lista.map((item) => (
                  <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} {...pinDe(item)} />
                ))}
              </div>
            );
          }
          const area = lista[0]?.area;
          const activaAquiMismo = lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn));
          const clave = area ?? grupo;
          if (lista.length === 1) {
            return (
              <div key={clave} className="flex flex-col gap-px px-3">
                <Item item={lista[0]!} rutaActual={rutaActual} Link={Link} {...pinDe(lista[0]!)} />
              </div>
            );
          }
          return (
            <div key={clave} className="px-3">
              <AreaGrupo
                etiqueta={grupo}
                icono={lista[0]!.icono}
                abierto={abierto === clave}
                activa={activaAquiMismo}
                onAlternar={() => alternar(grupo, area)}
              >
                {lista.map((item) => (
                  <EntradaArea
                    key={item.href}
                    item={item}
                    rutaActual={rutaActual}
                    Link={Link}
                    {...pinDe(item)}
                  />
                ))}
              </AreaGrupo>
            </div>
          );
        })}
    </div>
  );
}
