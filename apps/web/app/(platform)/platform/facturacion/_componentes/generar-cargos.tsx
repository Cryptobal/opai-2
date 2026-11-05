"use client";

import { FileCheck2 } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp, nombreMes } from "./cobro";

type Resultado = {
  creados: number;
  montoClp: number;
  empresas: {
    tenantId: string;
    creados: number;
    omitidos: { moduloId: string; motivo: string }[];
  }[];
};

/**
 * «Generar cargos» de un mes cerrado: primero la vista previa (`dryRun`) con lo que se crearía y lo
 * que se omite, y recién al confirmar se crean. Generar dos veces no duplica (idempotente).
 */
export function GenerarCargos({
  periodo,
  nombres,
}: {
  periodo: string;
  /** Nombres legibles: `tenantId` → empresa y `moduloId` → módulo. */
  nombres: Record<string, string>;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("platform");
  const [previa, setPrevia] = useState<Resultado | null>(null);
  const [abierta, setAbierta] = useState(false);
  async function abrir() {
    limpiarError();
    setAbierta(true);
    setPrevia(
      await ejecutar<Resultado>("platform.cobros.cargos_generar", { periodo }, true, "ninguna"),
    );
  }
  async function confirmar() {
    const r = await ejecutar<Resultado>("platform.cobros.cargos_generar", { periodo });
    if (!r) return;
    avisar.exito(r.creados ? `${r.creados} cargos listos para facturar` : "No había cargos nuevos");
    setAbierta(false);
  }
  const omitidos =
    previa?.empresas.flatMap((e) =>
      e.omitidos.map((o) => ({ ...o, empresa: nombres[e.tenantId] ?? e.tenantId })),
    ) ?? [];
  return (
    <>
      <Button variant="secondary" onClick={() => void abrir()}>
        <FileCheck2 className="size-4" aria-hidden /> Generar cargos
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo={`Cargos de ${nombreMes(periodo)}`}
        descripcion="Quedan listos para facturar. No se emite ninguna factura."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>
              Cancelar
            </Button>
            <Button disabled={pendiente || !previa?.creados} onClick={() => void confirmar()}>
              {previa?.creados ? `Generar ${previa.creados}` : "Nada que generar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {previa ? (
            <>
              <p className="text-base text-fg">
                Se crearán <strong>{previa.creados}</strong> cargos por{" "}
                <strong className="t-numeric">{clp(previa.montoClp)}</strong>.
              </p>
              {omitidos.length ? (
                <div className="flex flex-col gap-1.5">
                  <p className="t-label text-fg">No se generan</p>
                  <ul className="flex flex-col gap-1 text-sm text-fg-muted">
                    {omitidos.map((o, i) => (
                      <li key={`${o.moduloId}-${i}`}>
                        {o.empresa} · {nombres[o.moduloId] ?? o.moduloId}: {o.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : pendiente ? (
            <p className="t-caption">Calculando…</p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
