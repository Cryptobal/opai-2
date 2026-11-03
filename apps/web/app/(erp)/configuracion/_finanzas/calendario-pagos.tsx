"use client";

import { z } from "zod";

import { Campo, Input } from "@opai/ds";

const CONCEPTOS = [
  { id: "remuneraciones", etiqueta: "Remuneraciones" },
  { id: "imposiciones", etiqueta: "Imposiciones" },
  { id: "anticipos", etiqueta: "Anticipos" },
  { id: "iva", etiqueta: "IVA" },
] as const;

export type CalendarioPagos = Partial<Record<(typeof CONCEPTOS)[number]["id"], number>>;

const DiaSchema = z.coerce.number().int().min(1).max(28);

/** Texto del campo → día válido (1 a 28), vacío (sin proyección) o `null` si no es válido. */
export function leerDia(texto: string): number | undefined | null {
  if (texto.trim() === "") return undefined;
  const r = DiaSchema.safeParse(texto);
  return r.success ? r.data : null;
}

/** Día del mes en que se paga cada concepto; las proyecciones automáticas lo usan. Sin JSON a la vista. */
export function CalendarioPagosEditor({
  valor,
  onCambiar,
}: {
  valor: CalendarioPagos;
  onCambiar: (v: CalendarioPagos) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {CONCEPTOS.map((c) => {
        const actual = valor[c.id];
        return (
          <Campo
            key={c.id}
            etiqueta={`${c.etiqueta}: día del mes`}
            htmlFor={`cal-${c.id}`}
            ayuda="Entre 1 y 28. Déjalo vacío si no quieres proyectarlo."
          >
            <Input
              id={`cal-${c.id}`}
              inputMode="numeric"
              value={actual === undefined ? "" : String(actual)}
              onChange={(e) => {
                const dia = leerDia(e.target.value);
                if (dia === null) return;
                const { [c.id]: _quitado, ...resto } = valor;
                onCambiar(dia === undefined ? resto : { ...resto, [c.id]: dia });
              }}
            />
          </Campo>
        );
      })}
    </div>
  );
}
