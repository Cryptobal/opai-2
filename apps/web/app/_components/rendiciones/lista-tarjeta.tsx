import { Badge, Card } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { lineaEstado, pesos } from "./formato";
import {
  BASE,
  ETIQUETA_ESTADO,
  type PortalRendicion,
  type ResumenRendicion,
  TONO_ESTADO,
} from "./tipos";

const Estadotag = ({ r }: { r: ResumenRendicion }) => (
  <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
);

function Motivo({ r }: { r: ResumenRendicion }) {
  if (!r.motivoDecision || (r.estado !== "devuelta" && r.estado !== "rechazada")) return null;
  const devuelta = r.estado === "devuelta";
  return (
    <p className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg" role="note">
      <span className="font-semibold">
        {devuelta ? "Devuelta" : "Rechazada"}
        {r.aprobadorNombre ? ` por ${r.aprobadorNombre}` : ""}:
      </span>{" "}
      «{r.motivoDecision}»{devuelta ? " Corrígela y reenvíala." : ""}
    </p>
  );
}

export function CorregirRendicion({
  r,
  portal,
  className,
}: {
  r: ResumenRendicion;
  portal: PortalRendicion;
  className?: string;
}) {
  return r.estado === "devuelta" ? (
    <EnlaceBoton
      href={`${BASE[portal]}/${r.id}/corregir`}
      variante="primary"
      {...(className ? { className } : {})}
    >
      Corregir y reenviar
    </EnlaceBoton>
  ) : null;
}

/** Tarjeta móvil de una fila en «Mis rendiciones». */
export function TarjetaRendicion({ r, portal }: { r: ResumenRendicion; portal: PortalRendicion }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <LinkNext href={`${BASE[portal]}/${r.id}`} className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="t-label text-fg">{r.codigoVisible}</span>
          <Estadotag r={r} />
        </span>
        <span className="text-md font-medium text-fg">{r.descripcion}</span>
        <span className="t-title text-fg">{pesos(r.montoTotal)}</span>
        <span className="text-base text-fg-muted">{lineaEstado(r)}</span>
      </LinkNext>
      <Motivo r={r} />
      <CorregirRendicion r={r} portal={portal} className="w-full" />
    </Card>
  );
}