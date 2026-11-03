"use client";

import { Button, Sheet } from "@opai/ds";

import { pesos } from "@/lib/fechas";

type PasoTraza = {
  item?: string;
  monto?: string;
  formula?: string;
  valor?: number;
  exacto?: string;
};

export function HojaTrazaCalculo({
  titulo,
  traza,
  onCerrar,
}: {
  titulo: string;
  traza: PasoTraza[];
  onCerrar: () => void;
}) {
  return (
    <Sheet abierto titulo={titulo} onCerrar={onCerrar}>
      <div className="space-y-4 p-4">
        {traza.length === 0 ? (
          <p className="t-body-sm text-fg-muted">Sin pasos de cálculo para esta línea.</p>
        ) : (
          <ol className="space-y-3">
            {traza.map((t, i) => (
              <li key={`${t.monto ?? i}-${i}`} className="rounded-md border border-border p-3">
                <p className="t-label">{t.monto ?? t.item ?? `Paso ${i + 1}`}</p>
                {t.formula ? <p className="t-caption text-fg-subtle mt-1">{t.formula}</p> : null}
                {typeof t.valor === "number" ? (
                  <p className="t-body-sm t-numeric mt-2">{pesos(t.valor)}</p>
                ) : null}
                {t.exacto ? <p className="t-caption text-fg-muted mt-1 font-mono text-xs">{t.exacto}</p> : null}
              </li>
            ))}
          </ol>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
