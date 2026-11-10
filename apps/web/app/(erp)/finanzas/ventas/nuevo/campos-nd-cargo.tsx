"use client";

import { Campo, Input } from "@opai/ds";

type Props = {
  bloqueado: boolean;
  exenta: boolean;
  motivo: string;
  setMotivo: (v: string) => void;
  detalle: string;
  setDetalle: (v: string) => void;
  monto: string;
  setMonto: (v: string) => void;
};

/** Campos de la nota de débito de cargo (CAR-234): motivo (RazonRef, CodRef 3), detalle y monto sin IVA. */
export function CamposNdCargo(p: Props) {
  return (
    <>
      <Campo
        etiqueta="Motivo"
        htmlFor="ndc-motivo"
        ayuda="Va como razón de la referencia (CodRef 3, corrige montos)."
        error={p.motivo.length > 0 && p.motivo.trim().length < 3 ? "Mínimo 3 caracteres." : undefined}
      >
        <Input
          id="ndc-motivo"
          disabled={p.bloqueado}
          value={p.motivo}
          maxLength={300}
          onChange={(e) => p.setMotivo(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Detalle del cargo" htmlFor="ndc-detalle">
        <Input
          id="ndc-detalle"
          disabled={p.bloqueado}
          value={p.detalle}
          maxLength={300}
          onChange={(e) => p.setDetalle(e.target.value)}
        />
      </Campo>
      <Campo
        etiqueta={p.exenta ? "Monto exento (CLP)" : "Monto neto (CLP), sin IVA"}
        htmlFor="ndc-monto"
        ayuda={p.exenta ? "Sin IVA: la factura de origen es exenta." : "El IVA (19 %) se agrega al revisar."}
      >
        <Input
          id="ndc-monto"
          inputMode="numeric"
          disabled={p.bloqueado}
          value={p.monto}
          onChange={(e) => p.setMonto(e.target.value.replace(/\D/g, ""))}
        />
      </Campo>
    </>
  );
}
