"use client";

import { Campo, Input, InputFecha, Select, Textarea } from "@opai/ds";
import { CamposBonos } from "./campos-bonos";
import { errorMonto, parsearMonto } from "./monto";
import type { EstructuraVista } from "@/lib/tipos-sueldo";

export const MONTOS = [
  { clave: "sueldoBase", etiqueta: "Sueldo base" },
  { clave: "colacion", etiqueta: "Colación" },
  { clave: "movilizacion", etiqueta: "Movilización" },
] as const;
export function datosIniciales(base: EstructuraVista | null, hoy: string) {
  const visible = base && !base.sensible ? base : null;
  return {
    sueldoBase: String(visible?.sueldoBase ?? ""),
    colacion: String(visible?.colacion ?? ""),
    movilizacion: String(visible?.movilizacion ?? ""),
    gratificacion: visible?.gratificacion ?? "legal_25",
    gratificacionMonto: String(visible?.gratificacionMonto ?? ""),
    desde: hoy,
    motivo: "",
    items: (visible?.items ?? []).map((i) => ({
      ...i,
      montoTexto: String(i.monto ?? ""),
      porcentajeTexto: String(i.porcentaje ?? ""),
    })),
  };
}
export type DatosCapa = ReturnType<typeof datosIniciales>;
export function CamposCapa({
  datos: d,
  cambiar,
  motivoObligatorio,
}: {
  datos: DatosCapa;
  cambiar: (d: DatosCapa) => void;
  motivoObligatorio: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {MONTOS.map((m) => (
        <Campo
          key={m.clave}
          etiqueta={`${m.etiqueta} (obligatorio)`}
          htmlFor={`c-${m.clave}`}
          ayuda="Define el monto completo; 0 es válido"
          error={errorMonto(d[m.clave])}
        >
          <Input
            id={`c-${m.clave}`}
            aria-invalid={Boolean(d[m.clave] && parsearMonto(d[m.clave]) === null)}
            aria-describedby={
              d[m.clave] && parsearMonto(d[m.clave]) === null ? `c-${m.clave}-error` : undefined
            }
            required
            inputMode="numeric"
            value={d[m.clave]}
            onChange={(e) => cambiar({ ...d, [m.clave]: e.target.value })}
          />
        </Campo>
      ))}
      <Campo etiqueta="Gratificación (obligatorio)" htmlFor="c-grat">
        <Select
          id="c-grat"
          valor={d.gratificacion}
          onCambiar={(v) => cambiar({ ...d, gratificacion: v })}
          opciones={[
            { valor: "legal_25", etiqueta: "Legal 25 % con tope" },
            { valor: "monto_fijo", etiqueta: "Monto fijo" },
            { valor: "ninguna", etiqueta: "Ninguna" },
          ]}
        />
      </Campo>
      {d.gratificacion === "monto_fijo" ? (
        <Campo
          etiqueta="Monto de gratificación (obligatorio)"
          htmlFor="c-grat-monto"
          error={errorMonto(d.gratificacionMonto)}
        >
          <Input
            id="c-grat-monto"
            aria-invalid={Boolean(
              d.gratificacionMonto && parsearMonto(d.gratificacionMonto) === null,
            )}
            aria-describedby={
              d.gratificacionMonto && parsearMonto(d.gratificacionMonto) === null
                ? "c-grat-monto-error"
                : undefined
            }
            required
            inputMode="numeric"
            value={d.gratificacionMonto}
            onChange={(e) => cambiar({ ...d, gratificacionMonto: e.target.value })}
          />
        </Campo>
      ) : null}
      <Campo etiqueta="Vigente desde (obligatorio)" htmlFor="c-desde">
        <InputFecha id="c-desde" valor={d.desde} onCambiar={(v) => cambiar({ ...d, desde: v })} />
      </Campo>
      <Campo
        etiqueta={motivoObligatorio ? "Motivo obligatorio" : "Motivo"}
        htmlFor="c-motivo"
        ayuda="Mínimo 5 caracteres cuando se indica"
      >
        <Textarea
          id="c-motivo"
          value={d.motivo}
          onChange={(e) => cambiar({ ...d, motivo: e.target.value })}
        />
      </Campo>
      <CamposBonos datos={d} cambiar={cambiar} />
    </div>
  );
}
