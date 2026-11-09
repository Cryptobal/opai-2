"use client";

import { Campo, InputMonto, Select } from "@opai/ds";

import type { AjusteTramo } from "@/lib/cobertura-entrada";
import { pesos } from "@/lib/fechas";

export type CargoCobertura = { cargoId: string; cargo: string; sueldoBaseClp?: number | null };
const SIN = "__sin";

/** Cargo y sueldo de un grupo de puestos; el sueldo solo se muestra con `cpq:costos.ver` (chip «Referencia del cargo»). */
export function AjusteCobertura({
  id,
  titulo,
  valor,
  cargos,
  verCostos,
  onCambiar,
}: {
  id: string;
  titulo?: string;
  valor: AjusteTramo;
  cargos: readonly CargoCobertura[];
  verCostos: boolean;
  onCambiar: (a: AjusteTramo) => void;
}) {
  const ref = cargos.find((c) => c.cargoId === valor.cargoId)?.sueldoBaseClp;
  return (
    <div className="space-y-3">
      {titulo ? <h4 className="t-label">{titulo}</h4> : null}
      <Campo etiqueta="Cargo" htmlFor={`${id}-cargo`} ayuda="Trae el sueldo de referencia para cotizar.">
        <Select
          id={`${id}-cargo`}
          valor={valor.cargoId || SIN}
          onCambiar={(v) => onCambiar({ ...valor, cargoId: v === SIN ? "" : v })}
          opciones={[{ valor: SIN, etiqueta: "Sin cargo" }, ...cargos.map((c) => ({ valor: c.cargoId, etiqueta: c.cargo }))]}
        />
      </Campo>
      {verCostos ? (
        <Campo
          etiqueta="Sueldo base (CLP)"
          htmlFor={`${id}-sueldo`}
          ayuda={ref != null ? `Referencia del cargo: ${pesos(ref)}. Vacío la usa.` : "Vacío deja el costo pendiente."}
        >
          <InputMonto
            id={`${id}-sueldo`}
            valor={valor.sueldo}
            onCambiar={(v) => onCambiar({ ...valor, sueldo: v })}
            {...(ref != null ? { placeholder: pesos(ref) } : {})}
          />
        </Campo>
      ) : null}
    </div>
  );
}
