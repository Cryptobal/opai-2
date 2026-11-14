import { Alerta, Button, Card } from "@opai/ds";

import { fecha as formatoFecha } from "@/lib/fechas";

import type { DatosRemuneraciones } from "./tabla-remuneraciones";

type Captura = DatosRemuneraciones["capturaSii"];

/** Aviso de UF desactualizada o fecha de la última captura del SII. */
export function AvisoCapturaSii({ fecha, captura }: { fecha: string; captura: Captura }) {
  return captura.ufDesactualizada ? (
    <Alerta tono="warning" titulo="UF desactualizada">
      {captura.ufVigenteDesde
        ? `La UF vigente es del ${captura.ufVigenteDesde}; hoy es ${formatoFecha(fecha)}.`
        : "No hay UF publicada para la fecha de hoy."}
      {captura.ultimaCaptura
        ? ` Última captura SII: ${captura.ultimaCaptura}.`
        : " Aún no hay capturas automáticas registradas."}
    </Alerta>
  ) : captura.ultimaCaptura ? (
    <p className="t-caption text-fg-muted">
      Última captura SII (UF): {captura.ultimaCaptura}
      {captura.ufVigenteDesde ? ` · UF vigente desde ${captura.ufVigenteDesde}` : null}
    </p>
  ) : null;
}

type Mutual = DatosRemuneraciones["mutualAdicional"];

/** Tasa adicional de la mutual con su botón de confirmar o editar. */
export function TarjetaMutual({
  mutual,
  puede,
  onEditar,
}: {
  mutual: Mutual;
  puede: boolean;
  onEditar: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <p className="t-label-sm text-fg-muted">Cotización adicional de la mutual</p>
        <p className="t-body">
          {mutual.estado === "vigente" ? mutual.resumen : "Pendiente de confirmar."}
        </p>
        {mutual.estado === "vigente" && mutual.confirmadoPor ? (
          <p className="t-caption text-fg-muted">
            Confirmada por {mutual.confirmadoPor}
            {mutual.confirmadoEn ? ` el ${mutual.confirmadoEn}` : null}
          </p>
        ) : null}
      </div>
      {puede ? (
        <Button className="self-start" onClick={onEditar}>
          {mutual.estado === "vigente" ? "Editar tasa" : "Confirmar tasa"}
        </Button>
      ) : null}
    </Card>
  );
}
