import { Alerta } from "@opai/ds";

import type { AlertaPlan } from "../../_componentes/tipos";

/** Resumen de errores del plan (arriba del árbol): el detalle de cada uno va en su fila. */
export function AlertasPlan({ alertas, faltantes }: { alertas: AlertaPlan[]; faltantes: string[] }) {
  const errores = alertas.filter((a) => a.severidad === "error");
  return (
    <div className="flex flex-col gap-3">
      {errores.length ? (
        <Alerta tono="danger" titulo={`${errores.length} ${errores.length === 1 ? "cuenta con un error" : "cuentas con errores"}`}>
          Corrígelas para que el balance cuadre: cada una indica qué debe cambiar.
        </Alerta>
      ) : null}
      {faltantes.length ? (
        <Alerta tono="warning" titulo="Faltan cuentas con rol contable">
          Sin cuenta para: {faltantes.join(", ").replaceAll("_", " ")}.
        </Alerta>
      ) : null}
    </div>
  );
}
