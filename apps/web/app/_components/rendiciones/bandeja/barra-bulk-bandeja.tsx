import { BarraSeleccion, Button, Textarea } from "@opai/ds";

import type { AccionBulk } from "./bulk-bandeja";

export function BarraBulkBandeja({
  cantidad,
  motivo,
  ocupado,
  onMotivo,
  onVistaPrevia,
}: {
  cantidad: number;
  motivo: string;
  ocupado: boolean;
  onMotivo: (v: string) => void;
  onVistaPrevia: (accion: AccionBulk) => void;
}) {
  if (cantidad === 0) return null;
  return (
    <BarraSeleccion texto={`${cantidad} seleccionadas`}>
      <div className="hidden max-w-md flex-1 px-2 md:block">
        <Textarea
          value={motivo}
          maxLength={500}
          placeholder="Motivo común al rechazar"
          onChange={(e) => onMotivo(e.target.value)}
        />
      </div>
      <Button variant="ghost" className="text-inverse-fg" disabled={ocupado} onClick={() => onVistaPrevia("rechazar")}>
        Rechazar
      </Button>
      <Button disabled={ocupado} onClick={() => onVistaPrevia("aprobar")}>
        Aprobar
      </Button>
    </BarraSeleccion>
  );
}