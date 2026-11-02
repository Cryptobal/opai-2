"use client";

import { Campo, Card, Combobox, Input, Select, Textarea } from "@opai/ds";

import type { CuentaFila } from "@/lib/tipos-maestros";

type Props = {
  cuentas: CuentaFila[];
  documentoId: string | null;
  cuentaId: string | null;
  setCuentaId: (id: string | null) => void;
  tipoDte: "33" | "34";
  setTipoDte: (v: "33" | "34") => void;
  plazoPagoDias: string;
  setPlazoPagoDias: (v: string) => void;
  glosa: string;
  setGlosa: (v: string) => void;
};

export function EmitirClienteTipo({
  cuentas,
  documentoId,
  cuentaId,
  setCuentaId,
  tipoDte,
  setTipoDte,
  plazoPagoDias,
  setPlazoPagoDias,
  glosa,
  setGlosa,
}: Props) {
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="t-label text-fg">Cliente y tipo</h2>
      <Campo etiqueta="Cuenta" htmlFor="emit-cuenta">
        <Combobox
          id="emit-cuenta"
          placeholder="Buscar cliente"
          disabled={Boolean(documentoId)}
          valor={cuentaId}
          onCambiar={([v]) => setCuentaId(v ?? null)}
          opciones={cuentas.map((c) => ({
            valor: c.id,
            etiqueta: c.nombre,
            detalle: c.rut ?? "Sin RUT",
          }))}
        />
      </Campo>
      <Campo etiqueta="Tipo de DTE" htmlFor="emit-tipo">
        <Select
          id="emit-tipo"
          disabled={Boolean(documentoId)}
          valor={tipoDte}
          onCambiar={(v) => setTipoDte(v as "33" | "34")}
          opciones={[
            { valor: "33", etiqueta: "33 · Factura afecta" },
            { valor: "34", etiqueta: "34 · Factura exenta" },
          ]}
        />
      </Campo>
      <Campo etiqueta="Plazo de pago (días)" htmlFor="emit-plazo">
        <Input
          id="emit-plazo"
          inputMode="numeric"
          disabled={Boolean(documentoId)}
          value={plazoPagoDias}
          onChange={(e) => setPlazoPagoDias(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Glosa (opcional)" htmlFor="emit-glosa">
        <Textarea
          id="emit-glosa"
          disabled={Boolean(documentoId)}
          value={glosa}
          onChange={(e) => setGlosa(e.target.value)}
        />
      </Campo>
    </Card>
  );
}
