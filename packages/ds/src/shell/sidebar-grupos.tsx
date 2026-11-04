"use client";

import { AreaGrupo } from "./area-grupo";
import { iconoDeArea } from "./area-iconos";
import { EntradaArea, Item } from "./sidebar-item";
import { esActivo, type LinkComponent, type NavItem } from "./types";

type Props = {
  grupo: string;
  lista: NavItem[];
  rutaActual: string;
  Link: LinkComponent;
  /** Área abierta del acordeón; sin `onAreaAbierta` los grupos van siempre abiertos. */
  abierto: string | null;
  onAreaAbierta?: ((area: string) => void) | undefined;
  pinDe: (item: NavItem) => { onFijar?: () => void; fijado?: boolean };
};

const tituloGrupo = "t-overline px-2 py-2 text-fg-muted";

/** Un grupo de la barra lateral: entradas sueltas (sin grupo) o un área con su encabezado. */
export function GrupoNav({ grupo, lista, rutaActual, Link, abierto, onAreaAbierta, pinDe }: Props) {
  if (!grupo) {
    return (
      <div className="flex flex-col gap-0.5 px-3 pb-1">
        {lista.map((item) => (
          <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} {...pinDe(item)} />
        ))}
      </div>
    );
  }
  const area = lista[0]?.area;
  const clave = area ?? grupo;
  const colapsable = !!onAreaAbierta;
  const expandido = !colapsable || abierto === clave;
  const activa = lista.some((x) => esActivo(rutaActual, x.href, x.exacta, x.activoEn));
  if (!colapsable && lista.length === 1) {
    return (
      <div className="flex flex-col gap-px px-3">
        <Item item={lista[0]!} rutaActual={rutaActual} Link={Link} {...pinDe(lista[0]!)} />
      </div>
    );
  }
  if (!colapsable) {
    return (
      <section className="mt-3 px-3" aria-label={grupo}>
        <h2 className={tituloGrupo}>{grupo}</h2>
        {lista.map((item) => (
          <Item key={item.href} item={item} rutaActual={rutaActual} Link={Link} {...pinDe(item)} />
        ))}
      </section>
    );
  }
  // Acordeón (§8.2.1): encabezado con icono y chevron; las entradas llevan guía vertical
  // y la activa, la barra de acento (§8.2.2). Un área con una sola entrada también lleva
  // su encabezado, para que Firmas no quede suelta fuera de Documentos.
  return (
    <section className="mt-2 px-3" aria-label={grupo}>
      <AreaGrupo
        etiqueta={grupo}
        icono={iconoDeArea(area)}
        abierto={expandido}
        activa={activa}
        onAlternar={() => onAreaAbierta!(area ?? grupo)}
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
    </section>
  );
}
