"use client";

import { Campo, Input } from "@opai/ds";

export function PresupuestoKey({
  valor,
  invalido,
  servicio,
  onCambiar,
}: {
  valor: string;
  invalido: boolean;
  servicio: boolean;
  onCambiar: (valor: string) => void;
}) {
  return (
    <Campo
      etiqueta="Presupuesto mensual (US$)"
      htmlFor="key-tope"
      {...(invalido ? { error: "Ingresa un monto mayor que cero, por ejemplo 15 o 10,5." } : {})}
      ayuda={
        servicio
          ? "Obligatorio para servicio, mayor que cero. Aviso al 80 % y corte al 100 %."
          : "Al 80 % avisamos; al 100 % se detiene. Vacío: sin límite."
      }
    >
      <div className="flex items-center gap-2">
        <span>US$</span>
        <Input
          id="key-tope"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          aria-invalid={invalido}
        />
      </div>
    </Campo>
  );
}
