"use client";

import { Campo, Card, Combobox, Input, Select, Textarea } from "@opai/ds";

import type { CuentaFila } from "@/lib/tipos-maestros";

import { EmitirFechaEmision } from "./emitir-fecha";
import type { TipoEmision } from "./emitir-util";

function filaTributaria(etiqueta: string, valor: string | null | undefined) {
  if (!valor?.trim()) return null;
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-fg-muted">{etiqueta}</span>
      <span className="text-right text-fg">{valor}</span>
    </div>
  );
}

type Props = {
  cuentas: CuentaFila[];
  documentoId: string | null;
  cuentaId: string | null;
  setCuentaId: (id: string | null) => void;
  tipoDte: TipoEmision;
  setTipoDte: (v: TipoEmision) => void;
  plazoPagoDias: string;
  setPlazoPagoDias: (v: string) => void;
  glosa: string;
  setGlosa: (v: string) => void;
  fechaEmision?: string;
  setFechaEmision?: (v: string) => void;
  hoyIso?: string;
};

export function EmitirClienteTipo({
  cuentas,
  documentoId,
  cuentaId,
  setCuentaId,
  tipoDte,
  setTipoDte,
  plazoPagoDias,
  fechaEmision,
  setFechaEmision,
  hoyIso,
  setPlazoPagoDias,
  glosa,
  setGlosa,
}: Props) {
  const cuenta = cuentas.find((c) => c.id === cuentaId);
  const razonDte = cuenta?.razonSocial?.trim() || cuenta?.nombre;
  const esNota = tipoDte === "61" || tipoDte === "56";

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
      {cuenta ? (
        <div className="rounded-md border border-border bg-bg-subtle p-3">
          <p className="t-overline mb-2 text-fg-muted">Datos tributarios (desde la cuenta)</p>
          <div className="flex flex-col gap-1">
            {filaTributaria("Razón social DTE", razonDte ?? null)}
            {filaTributaria("Giro", cuenta.giro)}
            {filaTributaria("Dirección", cuenta.calle)}
            {filaTributaria("Comuna", cuenta.comuna)}
            {filaTributaria("Ciudad", cuenta.ciudad)}
            {filaTributaria("Correo DTE", cuenta.emailDte)}
          </div>
        </div>
      ) : null}
      <Campo etiqueta="Tipo de DTE" htmlFor="emit-tipo">
        <Select
          id="emit-tipo"
          disabled={Boolean(documentoId)}
          valor={tipoDte}
          onCambiar={(v) => setTipoDte(v as TipoEmision)}
          opciones={[
            { valor: "33", etiqueta: "33 · Factura afecta" },
            { valor: "34", etiqueta: "34 · Factura exenta" },
            { valor: "61", etiqueta: "61 · Nota de crédito (corrige una factura)" },
            { valor: "56", etiqueta: "56 · Nota de débito (cargo o anula una nota de crédito)" },
          ]}
        />
      </Campo>
      {esNota ? null : (
        <Campo etiqueta="Plazo de pago (días)" htmlFor="emit-plazo">
          <Input
            id="emit-plazo"
            inputMode="numeric"
            disabled={Boolean(documentoId)}
            value={plazoPagoDias}
            onChange={(e) => setPlazoPagoDias(e.target.value)}
          />
        </Campo>
      )}
      {esNota || !hoyIso || fechaEmision === undefined || !setFechaEmision ? null : (
        <EmitirFechaEmision valor={fechaEmision} onCambiar={setFechaEmision} hoyIso={hoyIso} disabled={Boolean(documentoId)} />
      )}
      {esNota ? null : (
        <Campo etiqueta="Glosa (opcional)" htmlFor="emit-glosa">
          <Textarea
            id="emit-glosa"
            disabled={Boolean(documentoId)}
            value={glosa}
            onChange={(e) => setGlosa(e.target.value)}
          />
        </Campo>
      )}
    </Card>
  );
}
