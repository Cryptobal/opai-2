import { Badge, Enlace, SeccionTarjeta } from "@opai/ds";

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

export function TarjetaNovedad({ item }: { item: ItemNovedad }) {
  return (
    <SeccionTarjeta
      titulo={item.leida ? item.titulo : `Nueva · ${item.titulo}`}
      accion={
        <Badge tono="neutro" punto={false}>
          {item.moduloEtiqueta}
        </Badge>
      }
    >
      <p className="t-caption mb-2 text-fg-muted">
        {formatearFecha(item.fecha)}
        {item.car ? ` · ${item.car}` : ""}
      </p>
      <p className="t-body whitespace-pre-wrap text-fg">{item.descripcion}</p>
      {item.imagen ? (
        <div className="mt-3 max-w-md overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- URLs opcionales en /public/changelog */}
          <img src={item.imagen} alt="" className="aspect-video w-full object-cover" />
        </div>
      ) : null}
      {item.ruta ? (
        <div className="mt-3">
          <Enlace href={item.ruta}>Ver en OPAI</Enlace>
        </div>
      ) : null}
    </SeccionTarjeta>
  );
}
