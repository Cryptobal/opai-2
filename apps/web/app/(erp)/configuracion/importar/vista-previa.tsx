"use client";

import { useState } from "react";

import { Badge, Segmentado, Table, Td, Th, Tr } from "@opai/ds";

import type { Accion, Conteos, FilaVista } from "./tipos";

const ETIQUETA: Record<Accion, string> = { crear: "Se crea", actualizar: "Se completa", sin_cambio: "Ya estaba igual", error: "Con error" };
const TONO: Record<Accion, "success" | "info" | "neutro" | "danger"> = { crear: "success", actualizar: "info", sin_cambio: "neutro", error: "danger" };
const MAX_FILAS = 200;

export function ResumenConteos({ conteos }: { conteos: Conteos }) {
  const orden: Accion[] = ["crear", "actualizar", "sin_cambio", "error"];
  return (
    <ul className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {orden.map((a) => (
        <li key={a} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
          <span className="t-title tabular-nums">{conteos[a].toLocaleString("es-CL")}</span>
          <Badge tono={TONO[a]}>{ETIQUETA[a]}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** Fila por fila: qué pasaría con cada una y por qué. Parte mostrando los errores si los hay. */
export function TablaFilas({ filas }: { filas: FilaVista[] }) {
  const hayErrores = filas.some((f) => f.accion === "error");
  const [solo, setSolo] = useState<"errores" | "todas">(hayErrores ? "errores" : "todas");
  const visibles = filas.filter((f) => solo === "todas" || f.accion === "error");
  return (
    <div className="flex flex-col gap-3">
      {hayErrores ? (
        <Segmentado
          etiqueta="Qué filas mostrar"
          activa={solo}
          opciones={[
            { id: "errores", etiqueta: "Solo con error", onClick: () => setSolo("errores") },
            { id: "todas", etiqueta: "Todas", onClick: () => setSolo("todas") },
          ]}
        />
      ) : null}
      <Table>
        <thead>
          <tr>
            <Th>Fila</Th>
            <Th>Registro</Th>
            <Th>Resultado</Th>
            <Th>Detalle</Th>
          </tr>
        </thead>
        <tbody>
          {visibles.slice(0, MAX_FILAS).map((f) => (
            <Tr key={f.fila}>
              <Td className="tabular-nums">{f.fila}</Td>
              <Td>{f.etiqueta || "—"}</Td>
              <Td>
                <Badge tono={TONO[f.accion]}>{ETIQUETA[f.accion]}</Badge>
              </Td>
              <Td className="min-w-64 whitespace-normal">
                {[...f.mensajes, ...(f.cambios.length ? [`Completa: ${f.cambios.join(", ")}.`] : [])].join(" ") || "—"}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {visibles.length > MAX_FILAS ? (
        <p className="t-caption">Se muestran las primeras {MAX_FILAS} de {visibles.length.toLocaleString("es-CL")} filas.</p>
      ) : null}
    </div>
  );
}
