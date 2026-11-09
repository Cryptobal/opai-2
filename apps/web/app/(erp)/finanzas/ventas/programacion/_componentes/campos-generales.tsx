"use client";

import { Campo, Card, Combobox, Input, InputFecha, Select, Switch } from "@opai/ds";

import { CamposFactura } from "./campos-factura";
import { CamposPrevios } from "./campos-previos";
import { CamposUf } from "./campos-uf";
import { DIAS, MESES, SEMANA } from "./opciones-agenda";
import type { FormProgramacion } from "./tipos";

type Props = {
  f: FormProgramacion;
  set: (cambio: Partial<FormProgramacion>) => void;
  cuentas: { id: string; nombre: string; rut: string | null }[];
  editando: boolean;
};

/** Cliente, agenda, moneda y plazo de una programación. */
export function CamposGenerales({ f, set, cuentas, editando }: Props) {
  const porSemana = f.frecuencia === "semanal" || f.frecuencia === "quincenal";
  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="t-label text-fg">Cliente y agenda</h2>
      <Campo etiqueta="Nombre" htmlFor="prog-nombre">
        <Input
          id="prog-nombre"
          value={f.nombre}
          onChange={(e) => set({ nombre: e.target.value })}
          placeholder="Servicio mensual"
        />
      </Campo>
      <Campo etiqueta="Cliente" htmlFor="prog-cuenta">
        <Combobox
          id="prog-cuenta"
          placeholder="Buscar cliente"
          valor={f.cuentaId}
          onCambiar={([v]) => set({ cuentaId: v ?? null, destinatarioIds: [] })}
          opciones={cuentas.map((c) => ({
            valor: c.id,
            etiqueta: c.nombre,
            detalle: c.rut ?? "Sin RUT",
          }))}
        />
      </Campo>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Tipo de factura" htmlFor="prog-tipo">
          <Select
            id="prog-tipo"
            valor={f.tipoDte}
            onCambiar={(v) => set({ tipoDte: v as FormProgramacion["tipoDte"] })}
            opciones={[
              { valor: "33", etiqueta: "33 · Factura afecta" },
              { valor: "34", etiqueta: "34 · Factura exenta" },
            ]}
          />
        </Campo>
        <Campo etiqueta="Frecuencia" htmlFor="prog-frecuencia">
          <Select
            id="prog-frecuencia"
            valor={f.frecuencia}
            onCambiar={(v) => set({ frecuencia: v as FormProgramacion["frecuencia"] })}
            opciones={[
              { valor: "mensual", etiqueta: "Mensual" },
              { valor: "quincenal", etiqueta: "Quincenal" },
              { valor: "semanal", etiqueta: "Semanal" },
              { valor: "anual", etiqueta: "Anual" },
            ]}
          />
        </Campo>
        {porSemana ? (
          <Campo etiqueta="Día de la semana" htmlFor="prog-semana">
            <Select
              id="prog-semana"
              valor={f.diaSemana}
              onCambiar={(v) => set({ diaSemana: v })}
              opciones={SEMANA}
            />
          </Campo>
        ) : (
          <Campo etiqueta="Día de generación del borrador" htmlFor="prog-dia">
            <Select
              id="prog-dia"
              valor={f.diaGeneracion}
              onCambiar={(v) => set({ diaGeneracion: v })}
              opciones={DIAS}
            />
          </Campo>
        )}
        {f.frecuencia === "anual" ? (
          <Campo etiqueta="Mes" htmlFor="prog-mes">
            <Select
              id="prog-mes"
              valor={f.mesDelAnio}
              onCambiar={(v) => set({ mesDelAnio: v })}
              opciones={MESES}
            />
          </Campo>
        ) : null}
        <Campo etiqueta="Plazo de pago (días)" htmlFor="prog-plazo">
          <Input
            id="prog-plazo"
            inputMode="numeric"
            value={f.plazoPagoDias}
            onChange={(e) => set({ plazoPagoDias: e.target.value })}
          />
        </Campo>
        <Campo etiqueta="Moneda de las líneas" htmlFor="prog-moneda">
          <Select
            id="prog-moneda"
            valor={f.moneda}
            disabled={editando && f.lineas.some((l) => l.precio.trim() !== "")}
            onCambiar={(v) => set({ moneda: v as FormProgramacion["moneda"] })}
            opciones={[
              { valor: "CLP", etiqueta: "Pesos (CLP)" },
              { valor: "UF", etiqueta: "UF" },
            ]}
          />
        </Campo>
        <CamposUf f={f} set={set} />
        <CamposFactura f={f} set={set} />
        <Switch
          etiqueta="Proforma antes de facturar"
          descripcion="Marca la modalidad: el cliente recibe una proforma y da su OK antes de la factura. No es un documento tributario."
          activo={f.autoEnvioProforma}
          onCambiar={(v) => set({ autoEnvioProforma: v })}
        />
        <Switch
          etiqueta="Estado de pago antes de facturar"
          descripcion="Marca la modalidad: el cliente recibe un estado de pago antes de la factura. No es un documento tributario."
          activo={f.autoEnvioEstadoPago}
          onCambiar={(v) => set({ autoEnvioEstadoPago: v })}
        />
        <CamposPrevios f={f} set={set} />
        <Campo etiqueta="Desde (opcional)" htmlFor="prog-inicio">
          <InputFecha
            id="prog-inicio"
            valor={f.fechaInicio}
            onCambiar={(v) => set({ fechaInicio: v })}
          />
        </Campo>
        <Campo etiqueta="Hasta (opcional)" htmlFor="prog-fin">
          <InputFecha id="prog-fin" valor={f.fechaFin} onCambiar={(v) => set({ fechaFin: v })} />
        </Campo>
      </div>
    </Card>
  );
}
