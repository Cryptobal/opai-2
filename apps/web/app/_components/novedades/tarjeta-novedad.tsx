import { Badge, Button, Enlace, SeccionTarjeta } from "@opai/ds";

import { TextoNovedad } from "./texto-novedad";

export type ItemNovedad = {
  id: string;
  fecha: string;
  moduloEtiqueta: string;
  titulo: string;
  descripcion: string;
  ruta: string | null;
  imagen: string | null;
  destacada: boolean;
  car: string | null;
  leida: boolean;
};

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

/**
 * Una novedad del producto (CAR-316): la no leída lleva la etiqueta «Nueva», el borde de acento y el
 * botón «Marcar como leída»; el texto se dibuja con su formato, sin asteriscos.
 */
export function TarjetaNovedad({
  item,
  onMarcar,
}: {
  item: ItemNovedad;
  onMarcar?: (id: string) => void;
}) {
  return (
    <SeccionTarjeta
      titulo={item.titulo}
      {...(item.leida ? {} : { className: "border-accent" })}
      accion={
        <>
          {item.leida ? null : (
            <Badge tono="danger">
              Nueva
            </Badge>
          )}
          <Badge tono="neutro" punto={false}>
            {item.moduloEtiqueta}
          </Badge>
        </>
      }
    >
      <p className="t-caption mb-2 text-fg-muted">
        {formatearFecha(item.fecha)}
        {item.car ? ` · ${item.car}` : ""}
      </p>
      <TextoNovedad texto={item.descripcion} />
      {item.imagen ? (
        <div className="mt-3 max-w-md overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- URLs opcionales en /public/changelog */}
          <img src={item.imagen} alt="" className="aspect-video w-full object-cover" />
        </div>
      ) : null}
      {item.ruta || (!item.leida && onMarcar) ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {item.ruta ? <Enlace href={item.ruta}>Ver en OPAI</Enlace> : null}
          {!item.leida && onMarcar ? (
            <Button variant="ghost" className="h-11 md:h-9" onClick={() => onMarcar(item.id)}>
              Marcar como leída
            </Button>
          ) : null}
        </div>
      ) : null}
    </SeccionTarjeta>
  );
}
