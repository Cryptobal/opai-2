import { Card, CardContent, CardHeader, CardTitle } from "@opai/ds";

import { EnlaceBoton } from "../maestros/enlace-boton";

import type { ReferenciaEntidad } from "./tipos";

/** Tarjeta compacta de una ficha nombrada por el agente (CAR-446; patrón Linear). */
export function TarjetaEntidad({ entidad }: { entidad: ReferenciaEntidad }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center gap-2 p-3 pb-1">
        <CardTitle className="t-label min-w-0 flex-1 truncate text-fg">{entidad.titulo}</CardTitle>
        <EnlaceBoton href={entidad.href} variante="secondary" className="shrink-0">
          Abrir
        </EnlaceBoton>
      </CardHeader>
      {entidad.detalle ? (
        <CardContent className="p-3 pt-0">
          <p className="t-caption truncate text-fg-muted">{entidad.detalle}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
