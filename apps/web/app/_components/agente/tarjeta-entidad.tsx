import { Badge, Card, CardContent, CardHeader, CardTitle } from "@opai/ds";

import { EnlaceBoton } from "../maestros/enlace-boton";

import type { ReferenciaEntidad } from "./tipos";

/** Ficha compacta de una entidad del agente (CAR-446/523); título, estado, datos y Abrir. */
export function TarjetaEntidad({ entidad }: { entidad: ReferenciaEntidad }) {
  const campos =
    entidad.campos?.length ?
      entidad.campos.slice(0, 3)
    : entidad.detalle && !entidad.estado ? [entidad.detalle]
    : entidad.detalle && entidad.estado && entidad.detalle !== entidad.estado ? [entidad.detalle]
    : [];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start gap-2 p-3 pb-1">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="t-label truncate text-fg">{entidad.titulo}</CardTitle>
          {entidad.estado ? (
            <Badge tono="neutro" punto={false} className="max-w-full truncate">
              {entidad.estado}
            </Badge>
          ) : null}
        </div>
        <EnlaceBoton href={entidad.href} variante="secondary" className="shrink-0">
          Abrir
        </EnlaceBoton>
      </CardHeader>
      {campos.length ? (
        <CardContent className="space-y-0.5 p-3 pt-0">
          {campos.map((c) => (
            <p key={c} className="t-caption truncate text-fg-muted">
              {c}
            </p>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
