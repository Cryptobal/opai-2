"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button, Campo, Card, Input, InputMonto } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import { EmitirTotales } from "./emitir-totales";
import { type LineaForm, LINEA_NUEVA, montoDeLinea } from "./emitir-util";

type Props = {
  documentoId: string | null;
  tipoDte: "33" | "34";
  lineas: LineaForm[];
  setLineas: Dispatch<SetStateAction<LineaForm[]>>;
};

/** Bloque de líneas de detalle del borrador DTE: cantidad × precio − descuento, con neto, IVA y total al pie. */
export function EmitirLineasDetalle({ documentoId, tipoDte, lineas, setLineas }: Props) {
  const fijo = Boolean(documentoId);
  const cambiar = (i: number, c: Partial<LineaForm>) =>
    setLineas((rows) => rows.map((r, j) => (j === i ? { ...r, ...c } : r)));
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-label text-fg">Detalle</h2>
        {!fijo ? (
          <Button variant="ghost" size="iconSm" onClick={() => setLineas((l) => [...l, LINEA_NUEVA])}>
            <Plus className="size-4" aria-hidden /> Línea
          </Button>
        ) : null}
      </div>
      {lineas.map((l, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <Campo etiqueta="Glosa" htmlFor={`emit-l-g-${i}`}>
            <Input id={`emit-l-g-${i}`} disabled={fijo} value={l.glosa} onChange={(e) => cambiar(i, { glosa: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo etiqueta="Cantidad" htmlFor={`emit-l-c-${i}`}>
              <Input id={`emit-l-c-${i}`} inputMode="decimal" disabled={fijo} value={l.cantidad} onChange={(e) => cambiar(i, { cantidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Precio unitario" htmlFor={`emit-l-p-${i}`}>
              <InputMonto id={`emit-l-p-${i}`} className="t-numeric" disabled={fijo} valor={l.precio} onCambiar={(precio) => cambiar(i, { precio })} />
            </Campo>
            <Campo etiqueta="Descuento (%)" htmlFor={`emit-l-d-${i}`}>
              <Input id={`emit-l-d-${i}`} inputMode="decimal" disabled={fijo} value={l.descuento} onChange={(e) => cambiar(i, { descuento: e.target.value })} />
            </Campo>
            <div className="flex flex-col gap-1">
              <span className="t-label text-fg">{tipoDte === "34" ? "Monto exento" : "Monto neto"}</span>
              <span className="t-numeric flex h-11 items-center text-md text-fg">
                {pesos(montoDeLinea(l) ?? 0)}
              </span>
            </div>
          </div>
          {lineas.length > 1 && !fijo ? (
            <Button variant="ghost" aria-label={`Quitar línea ${i + 1}`} onClick={() => setLineas((rows) => rows.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" aria-hidden /> Quitar
            </Button>
          ) : null}
        </div>
      ))}
      <EmitirTotales tipoDte={tipoDte} montos={lineas.map(montoDeLinea)} />
    </Card>
  );
}
