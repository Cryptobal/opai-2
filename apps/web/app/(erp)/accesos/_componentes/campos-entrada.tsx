"use client";

import { Campo, Checkbox, Input, InputFecha, Select, Switch, Textarea } from "@opai/ds";

import { type Borrador, DIAS, DOCS, TIPOS } from "./borrador-entrada";

export { BORRADOR_VACIO, type Borrador } from "./borrador-entrada";

const alternar = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

/** Campos de una entrada de lista (diseño `Listas`, hoja «Agregar»). El número nunca se guarda: solo su huella. */
export function CamposEntrada({
  b,
  set,
  bloqueada,
}: {
  b: Borrador;
  set: (b: Borrador) => void;
  bloqueada: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" htmlFor="ae-nombre">
        <Input
          id="ae-nombre"
          value={b.nombre}
          maxLength={120}
          onChange={(e) => set({ ...b, nombre: e.target.value })}
        />
      </Campo>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
        <Campo etiqueta="Documento" htmlFor="ae-doc">
          <Select
            id="ae-doc"
            valor={b.docTipo}
            opciones={DOCS}
            onCambiar={(v) => set({ ...b, docTipo: v })}
          />
        </Campo>
        <Campo
          etiqueta="Número"
          htmlFor="ae-numero"
          ayuda="Se guarda solo una huella, nunca el número."
        >
          <Input
            id="ae-numero"
            value={b.numero}
            maxLength={40}
            onChange={(e) => set({ ...b, numero: e.target.value })}
          />
        </Campo>
      </div>
      {b.docTipo === "run" ? null : (
        <Campo etiqueta="País (código de 2 o 3 letras)" htmlFor="ae-pais">
          <Input
            id="ae-pais"
            value={b.pais}
            maxLength={3}
            onChange={(e) => set({ ...b, pais: e.target.value.toUpperCase() })}
          />
        </Campo>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="t-label mb-1">Tipos de registro (sin marcar = todos)</legend>
        {TIPOS.map(([v, e]) => (
          <Checkbox
            key={v}
            etiqueta={e}
            marcado={b.tipos.includes(v)}
            onCambiar={() => set({ ...b, tipos: alternar(b.tipos, v) })}
          />
        ))}
      </fieldset>
      <Campo etiqueta="Vigente hasta (opcional)" htmlFor="ae-hasta">
        <InputFecha id="ae-hasta" valor={b.hasta} onCambiar={(v) => set({ ...b, hasta: v })} />
      </Campo>
      {bloqueada ? null : (
        <>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="t-label mb-1">Días permitidos (sin marcar = todos)</legend>
            {DIAS.map(([d, e]) => (
              <Checkbox
                key={d}
                etiqueta={e}
                marcado={b.dias.includes(d)}
                onCambiar={() => set({ ...b, dias: alternar(b.dias, d) })}
              />
            ))}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde (hora)" htmlFor="ae-desde">
              <InputFecha
                id="ae-desde"
                tipo="time"
                valor={b.desde}
                onCambiar={(v) => set({ ...b, desde: v })}
              />
            </Campo>
            <Campo etiqueta="Hasta (hora)" htmlFor="ae-hasta-hora">
              <InputFecha
                tipo="time"
                valor={b.hastaHora}
                onCambiar={(v) => set({ ...b, hastaHora: v })}
              />
            </Campo>
          </div>
          <Switch
            etiqueta="Uso único"
            descripcion="Sirve para una sola entrada."
            activo={b.usoUnico}
            onCambiar={(v) => set({ ...b, usoUnico: v })}
          />
        </>
      )}
      {bloqueada ? (
        <Campo
          etiqueta="Motivo del bloqueo"
          htmlFor="ae-motivo"
          ayuda="Solo lo ve quien gestiona listas; el guardia no lo ve."
        >
          <Textarea
            id="ae-motivo"
            rows={3}
            maxLength={300}
            value={b.motivo}
            onChange={(e) => set({ ...b, motivo: e.target.value })}
          />
        </Campo>
      ) : null}
    </div>
  );
}
