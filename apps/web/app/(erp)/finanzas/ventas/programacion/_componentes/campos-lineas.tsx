"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button, Campo, Card, Checkbox, Combobox, Input } from "@opai/ds";

import { LINEA_VACIA, type FormProgramacion, type LineaForm } from "./tipos";

type Props = {
  f: FormProgramacion;
  set: (cambio: Partial<FormProgramacion>) => void;
  contactos: { id: string; nombre: string; email: string | null }[];
};

/** Líneas del borrador que se repiten cada período, y destinatarios de la factura. */
export function CamposLineas({ f, set, contactos }: Props) {
  const cambiar = (i: number, c: Partial<LineaForm>) =>
    set({ lineas: f.lineas.map((l, j) => (j === i ? { ...l, ...c } : l)) });
  const quitar = (i: number) => set({ lineas: f.lineas.filter((_, j) => j !== i) });
  const precioEtiqueta = f.moneda === "UF" ? "Precio unitario (UF)" : "Precio unitario (CLP)";
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="t-label text-fg">Líneas</h2>
      {f.lineas.map((l, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <Campo etiqueta="Descripción" htmlFor={`linea-glosa-${i}`}>
            <Input
              id={`linea-glosa-${i}`}
              value={l.glosa}
              onChange={(e) => cambiar(i, { glosa: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Campo etiqueta="Cantidad" htmlFor={`linea-cant-${i}`}>
              <Input
                id={`linea-cant-${i}`}
                inputMode="decimal"
                value={l.cantidad}
                onChange={(e) => cambiar(i, { cantidad: e.target.value })}
              />
            </Campo>
            <Campo etiqueta={precioEtiqueta} htmlFor={`linea-precio-${i}`}>
              <Input
                id={`linea-precio-${i}`}
                inputMode="decimal"
                className="t-numeric"
                value={l.precio}
                placeholder={f.moneda === "UF" ? "12,5" : "1.500.000"}
                onChange={(e) => cambiar(i, { precio: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Descuento (%)" htmlFor={`linea-desc-${i}`}>
              <Input
                id={`linea-desc-${i}`}
                inputMode="decimal"
                value={l.descuento}
                onChange={(e) => cambiar(i, { descuento: e.target.value })}
              />
            </Campo>
          </div>
          <div className="flex items-center justify-between gap-3">
            {f.tipoDte === "33" ? (
              <span className="text-sm text-fg-muted">Afecta a IVA</span>
            ) : (
              <Checkbox marcado onCambiar={() => undefined} disabled etiqueta="Exenta" />
            )}
            {f.lineas.length > 1 ? (
              <Button
                variant="ghost"
                onClick={() => quitar(i)}
                aria-label={`Quitar línea ${i + 1}`}
              >
                <Trash2 className="size-4" aria-hidden />
                Quitar
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={() => set({ lineas: [...f.lineas, LINEA_VACIA] })}>
        <Plus className="size-4" aria-hidden />
        Agregar línea
      </Button>
      <Campo
        etiqueta="Destinatarios de la factura"
        htmlFor="prog-destinatarios"
        ayuda="Contactos del cliente que reciben el documento."
      >
        <Combobox
          id="prog-destinatarios"
          placeholder={f.cuentaId ? "Elegir contactos" : "Elige primero el cliente"}
          disabled={!f.cuentaId}
          valores={f.destinatarioIds}
          onCambiar={(v) => set({ destinatarioIds: v })}
          opciones={contactos.map((c) => ({
            valor: c.id,
            etiqueta: c.nombre,
            detalle: c.email ?? "Sin correo",
          }))}
        />
      </Campo>
    </Card>
  );
}
