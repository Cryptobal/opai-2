import { etiquetaPeriodo } from "@opai/domain";
import { SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { pesos } from "@/lib/fechas";

import type { Resumen, Vista } from "./datos";

// Sin Intl ni toLocale en pantalla (regla F1): nombres de mes fijos, la semana como «Semana del 9 nov».
const CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const nombre = (clave: string, vista: Vista) => {
  const [a, m, d] = clave.split("-").map(Number);
  return vista === "mes" ? etiquetaPeriodo(a ?? 0, m ?? 1) : `Semana del ${d ?? 1} ${CORTOS[(m ?? 1) - 1] ?? ""}`;
};
const TONO = { peligro: "text-danger-fg", alerta: "text-warning-fg" } as const;

/** Tabla de períodos: ingresos, egresos y saldo al cierre, con el tono de caja baja. */
export function Periodos({ r, vista }: { r: Resumen; vista: Vista }) {
  return (
    <SeccionTarjeta titulo={vista === "mes" ? "Mes a mes" : "Semana a semana"} accion={<span className="t-caption">Desde la semana en curso</span>}>
      <Table>
        <thead>
          <tr>
            <Th>{vista === "mes" ? "Mes" : "Semana"}</Th>
            <Th className="text-right">Ingresos</Th>
            <Th className="text-right">Egresos</Th>
            <Th className="text-right">Saldo al cierre</Th>
          </tr>
        </thead>
        <tbody>
          {r.periodos.map((p) => (
            <Tr key={p.clave}>
              <Td>
                {nombre(p.clave, vista)}
                {vista === "mes" ? <span className="t-caption block">{p.semanas} {p.semanas === 1 ? "semana" : "semanas"}</span> : null}
              </Td>
              <Td className="t-numeric text-right">{pesos(p.ingresos)}</Td>
              <Td className="t-numeric text-right">{pesos(p.egresos)}</Td>
              <Td className={`t-numeric text-right font-medium ${p.tono ? TONO[p.tono] : ""}`}>{pesos(p.saldoFinal)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </SeccionTarjeta>
  );
}
