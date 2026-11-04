"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

type Resultado = {
  periodo: string;
  fecha: string;
  estado: string;
  motivo: string | null;
  montoTotal: number | null;
};

/** Activar o pausar, editar y «Generar ahora» con vista previa (BRIEF-26). Nunca emite al SII. */
export function AccionesProgramacion({ id, activa }: { id: string; activa: boolean }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [preview, setPreview] = useState<Resultado[] | null>(null);

  async function cambiarEstado() {
    const r = await ejecutar("finanzas.ventas_programacion.cambiar_estado", {
      programacionId: id,
      activa: !activa,
    });
    if (r) {
      avisar.exito(activa ? "Programación pausada" : "Programación activada");
      router.refresh();
    }
  }

  async function revisar() {
    const r = await ejecutar<{ resultados: Resultado[] }>(
      "finanzas.ventas_programacion.generar",
      { programacionId: id },
      true,
    );
    if (r) setPreview(r.resultados);
  }

  async function generar() {
    const r = await ejecutar<{ resultados: Resultado[] }>("finanzas.ventas_programacion.generar", {
      programacionId: id,
    });
    setPreview(null);
    if (r) {
      const n = r.resultados.filter((x) => x.estado === "generado").length;
      avisar.exito(
        n
          ? `${n} borrador${n > 1 ? "es" : ""} generado${n > 1 ? "s" : ""}`
          : "No había períodos para generar",
      );
      router.refresh();
    }
  }

  const generables = preview?.filter((p) => p.estado === "generado") ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Button
          variant={activa ? "secondary" : "primary"}
          disabled={pendiente}
          onClick={() => void cambiarEstado()}
        >
          {activa ? "Pausar" : "Activar"}
        </Button>
        {activa ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void revisar()}>
            Generar ahora
          </Button>
        ) : null}
        <LinkNext
          href={`/finanzas/ventas/programacion/${id}/editar`}
          className="inline-flex h-11 items-center px-2 text-sm text-fg underline md:h-10"
        >
          Editar
        </LinkNext>
      </div>
      {error ? (
        <Alerta tono="danger" titulo="No se pudo completar">
          {error}
        </Alerta>
      ) : null}
      <Dialog
        abierto={preview !== null}
        onCerrar={() => setPreview(null)}
        titulo="Generar borradores"
        acciones={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button disabled={pendiente || generables.length === 0} onClick={() => void generar()}>
              Generar {generables.length || ""}
            </Button>
          </>
        }
      >
        {preview && preview.length === 0 ? (
          <p className="text-sm text-fg-muted">No hay períodos pendientes del último mes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {preview?.map((p) => (
              <li key={p.periodo} className="flex justify-between gap-3 py-2">
                <span>
                  {p.periodo}
                  {p.motivo ? <span className="block text-fg-muted">{p.motivo}</span> : null}
                </span>
                <span className="t-numeric">
                  {p.montoTotal !== null ? pesos(p.montoTotal) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-fg-muted">
          Se crean borradores para revisar; nada se envía al SII.
        </p>
      </Dialog>
    </div>
  );
}
