"use client";

import { formatearNumero } from "@opai/domain";

import { fechaHora } from "@/lib/formato";
import { Alerta } from "@opai/ds";

import type { VistaCartolaPreview as Vista } from "./tipos-cartola";

export type FilaVistaCartola = Vista["filas"][number];

const pesos = (n: number) => `$${formatearNumero(n)}`;

/** Cuadratura de la cartola (CAR-341): si no cuadra, el archivo está mal leído y no se importa. */
function AvisoCuadratura({ c }: { c: NonNullable<Vista["cuadratura"]> }) {
  if (c.cuadra) {
    return (
      <Alerta
        tono="success"
        titulo="La cartola cuadra"
      >
        {`Saldo inicial ${pesos(c.saldoInicial)} + movimientos ${pesos(c.sumaDetalle)} = saldo final ${pesos(c.saldoFinal)}.`}
      </Alerta>
    );
  }
  return (
    <Alerta
      tono="danger"
      titulo="La cartola no cuadra: no se puede importar"
    >
      {`Saldo inicial ${pesos(c.saldoInicial)} + movimientos ${pesos(c.sumaDetalle)} da ${pesos(c.saldoInicial + c.sumaDetalle)}, pero el saldo final de la cartola es ${pesos(c.saldoFinal)} (diferencia ${pesos(c.diferencia)}).`}
    </Alerta>
  );
}

export function VistaCartolaPreview({
  aplicados,
  duplicados,
  rechazados,
  filas,
  cuadratura,
  yaImportada,
}: {
  aplicados: number;
  duplicados: number;
  rechazados: number;
  filas: FilaVistaCartola[];
  cuadratura: Vista["cuadratura"];
  yaImportada?: Vista["yaImportada"];
}) {
  // Primero las rechazadas, con su motivo: son las que hay que revisar.
  const orden = [...filas].sort((a, b) => Number(b.estado === "rechazada") - Number(a.estado === "rechazada") || a.indice - b.indice);
  return (
    <>
      <Alerta tono="info" titulo={`${aplicados} nuevos · ${duplicados} duplicados · ${rechazados} rechazados`} />
      {cuadratura ? <AvisoCuadratura c={cuadratura} /> : null}
      {yaImportada ? (
        <Alerta tono="warning" titulo="Esta cartola ya se importó">
          {`${yaImportada.nombreArchivo ?? "Una cartola"} con el mismo período se importó el ${fechaHora(yaImportada.creadaEn)}. Si la vuelves a importar, sus movimientos quedan como duplicados. Para reemplazarla, deshazla primero en Importaciones.`}
        </Alerta>
      ) : null}
      <ul className="max-h-48 overflow-auto text-sm text-fg-muted">
        {orden.slice(0, 60).map((f) => (
          <li key={f.indice} className="border-b border-border py-1">
            Fila {f.indice + 1}: {f.estado}
            {f.monto != null ? ` · ${formatearNumero(f.monto)} CLP` : ""}
            {f.glosa ? ` · ${f.glosa}` : ""}
            {f.motivo ? ` · ${f.motivo}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
