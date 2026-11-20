import { FileSignature } from "lucide-react";

import { Badge, Empty } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { ETIQUETA_CLASE } from "./etiquetas";

export type FirmaPendiente = {
  solicitudId: string;
  clase: string;
  nivel: string;
  mensaje: string | null;
  plazoVence: string;
  estadoSolicitud: string;
};

/** Lista «Por firmar» del portal (CAR-634): enlaza al mismo flujo de firma que el correo, con sesión. */
export function ListaFirmasPendientes({
  items,
  baseHref,
}: {
  items: readonly FirmaPendiente[];
  baseHref: string;
}) {
  if (!items.length) {
    return (
      <Empty
        titulo="No tienes documentos por firmar"
        descripcion="Cuando te llegue algo para firmar, aparecerá aquí. También puedes usar el enlace del correo."
      />
    );
  }
  return (
    <ul className="-mx-4 divide-y divide-border border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
      {items.map((s) => (
        <li key={s.solicitudId}>
          <LinkNext
            href={`${baseHref}/${s.solicitudId}`}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
          >
            <FileSignature aria-hidden className="size-5 flex-none text-fg-subtle" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium text-fg">{ETIQUETA_CLASE[s.clase] ?? s.clase}</span>
              <span className="t-caption flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Nivel {s.nivel}</span>
                <Badge tono="warning">Por firmar</Badge>
                <span className="t-numeric">Vence {formatearFecha(s.plazoVence.slice(0, 10))}</span>
              </span>
            </span>
          </LinkNext>
        </li>
      ))}
    </ul>
  );
}

/** Enlace secundario a la lista (desde detalle). */
export function VolverALista({ href }: { href: string }) {
  return (
    <EnlaceBoton href={href} variante="ghost" className="self-start">
      Volver a la lista
    </EnlaceBoton>
  );
}