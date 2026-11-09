"use client";

import { Plus, Trash2 } from "lucide-react";

import { REFERENCIAS_SII } from "@opai/domain";
import { Button, Campo, Card, Input, Select } from "@opai/ds";

import { REF_VACIA, type RefForm } from "./emitir-util";

type Props = {
  refs: RefForm[];
  setRefs: (r: RefForm[]) => void;
  bloqueado: boolean;
  mensaje: { error: string | null; ayuda: string | null };
};

/** Referencias del DTE: solo el catálogo del SII, cada una con su folio y la fecha del documento referenciado. */
export function EmitirReferencias({ refs, setRefs, bloqueado, mensaje }: Props) {
  const cambiar = (i: number, parte: Partial<RefForm>) =>
    setRefs(refs.map((r, k) => (k === i ? { ...r, ...parte, tocada: true } : r)));
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="t-label text-fg">Referencias (opcional)</h2>
      <p className="text-sm text-fg-muted">
        Orden de compra, HES, contrato, resolución o guía de despacho que respalda esta factura.
      </p>
      {refs.map((r, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end"
        >
          <Campo etiqueta="Documento" htmlFor={`ref-tipo-${i}`}>
            <Select
              id={`ref-tipo-${i}`}
              disabled={bloqueado}
              valor={r.tipo}
              onCambiar={(v) => cambiar(i, { tipo: v })}
              opciones={REFERENCIAS_SII.map((x) => ({
                valor: String(x.codigo),
                etiqueta: `${x.codigo} · ${x.etiqueta}`,
              }))}
            />
          </Campo>
          <Campo etiqueta="Folio" htmlFor={`ref-folio-${i}`}>
            <Input
              id={`ref-folio-${i}`}
              inputMode="numeric"
              disabled={bloqueado}
              value={r.folioTexto}
              onChange={(e) => cambiar(i, { folioTexto: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Fecha del documento" htmlFor={`ref-fecha-${i}`}>
            <Input
              id={`ref-fecha-${i}`}
              type="date"
              disabled={bloqueado}
              value={r.fecha}
              onChange={(e) => cambiar(i, { fecha: e.target.value })}
            />
          </Campo>
          <Button
            variant="ghost"
            disabled={bloqueado}
            aria-label={`Quitar la referencia ${i + 1}`}
            onClick={() => setRefs(refs.filter((_, k) => k !== i))}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      {mensaje.error ? (
        <p role="alert" className="text-sm text-danger-fg">
          {mensaje.error}
        </p>
      ) : mensaje.ayuda ? (
        <p className="text-sm text-fg-muted">{mensaje.ayuda}</p>
      ) : null}
      <div>
        <Button
          variant="secondary"
          disabled={bloqueado || refs.length >= 10}
          onClick={() => setRefs([...refs, { ...REF_VACIA }])}
        >
          <Plus className="size-4" aria-hidden />
          Agregar referencia
        </Button>
      </div>
    </Card>
  );
}
