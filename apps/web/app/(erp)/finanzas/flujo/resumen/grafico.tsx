import { LineaSaldo, SeccionTarjeta } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import type { Resumen, Vista } from "./datos";
import { nombrePeriodo } from "./periodos";

/** Saldo al cierre de cada período como línea, con el umbral de saldo bajo (CAR-398). Sin JS en el navegador. */
export function GraficoSaldo({ r, vista }: { r: Resumen; vista: Vista }) {
  if (r.periodos.length < 2) return null;
  return (
    <SeccionTarjeta titulo="Saldo proyectado">
      <LineaSaldo
        etiqueta={vista === "mes" ? "Saldo al cierre de cada mes" : "Saldo al cierre de cada semana"}
        umbral={r.umbral > 0 ? { valor: r.umbral, texto: pesos(r.umbral) } : undefined}
        puntos={r.periodos.map((p) => ({
          etiqueta: nombrePeriodo(p.clave, vista),
          valor: p.saldoFinal,
          texto: pesos(p.saldoFinal),
          tono: p.tono,
        }))}
      />
    </SeccionTarjeta>
  );
}
