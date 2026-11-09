"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button, Campo, Card, Input } from "@opai/ds";

type LineaForm = { glosa: string; montoTexto: string };

type Props = {
  documentoId: string | null;
  lineas: LineaForm[];
  setLineas: Dispatch<SetStateAction<LineaForm[]>>;
};

/** Bloque de líneas de detalle del borrador DTE. */
export function EmitirLineasDetalle({ documentoId, lineas, setLineas }: Props) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-label text-fg">Detalle</h2>
        {!documentoId ? (
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setLineas((l) => [...l, { glosa: "", montoTexto: "" }])}
          >
            <Plus className="size-4" aria-hidden /> Línea
          </Button>
        ) : null}
      </div>
      {lineas.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Campo etiqueta={i === 0 ? "Glosa" : " "} htmlFor={`emit-l-g-${i}`}>
            <Input
              id={`emit-l-g-${i}`}
              disabled={Boolean(documentoId)}
              value={l.glosa}
              onChange={(e) =>
                setLineas((rows) =>
                  rows.map((r, j) => (j === i ? { ...r, glosa: e.target.value } : r)),
                )
              }
            />
          </Campo>
          <Campo etiqueta={i === 0 ? "Monto" : " "} htmlFor={`emit-l-m-${i}`}>
            <Input
              id={`emit-l-m-${i}`}
              inputMode="numeric"
              className="t-numeric"
              disabled={Boolean(documentoId)}
              value={l.montoTexto}
              onChange={(e) =>
                setLineas((rows) =>
                  rows.map((r, j) => (j === i ? { ...r, montoTexto: e.target.value } : r)),
                )
              }
            />
          </Campo>
          {lineas.length > 1 && !documentoId ? (
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Quitar línea"
              onClick={() => setLineas((rows) => rows.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}
    </Card>
  );
}
