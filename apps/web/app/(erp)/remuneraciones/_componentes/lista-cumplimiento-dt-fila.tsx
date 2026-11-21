import { Badge, Button, Td } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { MovimientoMiDt } from "./lista-cumplimiento-dt";

const ETIQUETA_MOV = { alta: "Alta", baja: "Baja", anexo: "Anexo", finiquito: "Finiquito" } as const;

export function FilaMovimientoMiDt({
  m,
  seg,
  variante,
  gestiona,
  pendiente,
  onDatos,
  onMarcar,
}: {
  m: MovimientoMiDt;
  seg: "pen" | "reg";
  variante: "contratos" | "finiquitos";
  gestiona: boolean;
  pendiente: boolean;
  onDatos: (m: MovimientoMiDt) => void;
  onMarcar: (m: MovimientoMiDt) => void;
}) {
  return (
    <tr key={m.clave}>
      <Td className="font-medium">{ETIQUETA_MOV[m.movimientoTipo]}</Td>
      <Td>
        <span className="block">{m.personaNombre}</span>
        <span className="t-mono t-caption text-fg-muted">{m.rut}</span>
      </Td>
      <Td className="text-fg-muted">{m.hechoTexto}</Td>
      <Td>
        <Badge tono={m.plazoTono === "neutral" ? "neutro" : m.plazoTono} punto>
          {m.plazoEtiqueta}
        </Badge>
      </Td>
      <Td className="text-right">
        <div className="flex justify-end gap-1">
          {variante === "finiquitos" ? (
            <EnlaceBoton href={`/remuneraciones/cumplimiento-dt/finiquitos/${m.referenciaId}`} variante="ghost">
              Ver finiquito
            </EnlaceBoton>
          ) : null}
          <Button variant="ghost" disabled={pendiente} onClick={() => onDatos(m)}>
            Datos
          </Button>
          {gestiona && !m.registrado ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => onMarcar(m)}>
              Marcar registrado
            </Button>
          ) : null}
        </div>
      </Td>
    </tr>
  );
}