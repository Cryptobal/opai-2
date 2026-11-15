"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@opai/ds";

const Dialogo = dynamic(() =>
  import("./dialogo-borrar-sincronizacion").then((m) => ({
    default: m.DialogoBorrarSincronizacion,
  })),
);

/**
 * Sección para borrar por fechas los movimientos que llegaron por la sincronización con el banco (CAR-341). El
 * diálogo se descarga recién al abrirlo, así la pestaña queda dentro del tope de JS (ADR-037).
 */
export function BorrarSincronizacion({ cuentaId }: { cuentaId: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <section className="rowcard flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="t-body-sm font-medium">Movimientos de la sincronización con el banco</p>
        <p className="t-caption text-fg-muted">
          No aparecen como importación. Si quedaron mal, bórralos por fechas y carga la cartola.
        </p>
      </div>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Borrar por fechas
      </Button>
      {abierto ? <Dialogo cuentaId={cuentaId} onCerrar={() => setAbierto(false)} /> : null}
    </section>
  );
}
