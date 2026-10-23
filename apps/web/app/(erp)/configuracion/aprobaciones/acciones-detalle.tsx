"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@opai/ds";

import { DialogoRechazar } from "./rechazar";
import { useResolver } from "./use-resolver";

/** Rechazar con motivo / Aprobar al pie del detalle de una aprobación (44). */
export function AccionesDetalle({ id }: { id: string }) {
  const [rechazar, setRechazar] = useState(false);
  const router = useRouter();
  const r = useResolver();
  const listo = () => router.replace("/configuracion/aprobaciones");
  return (
    <div className="mt-auto flex flex-col gap-2 pt-4">
      <div className="grid grid-cols-2 gap-3 [&>*]:h-12">
        <Button variant="secondary" onClick={() => setRechazar(true)}>
          Rechazar con motivo
        </Button>
        <Button
          disabled={r.pendiente}
          onClick={async () => {
            if (await r.aprobar([id])) listo();
          }}
        >
          Aprobar
        </Button>
      </div>
      {r.error && !rechazar ? (
        <p className="text-sm font-medium text-danger-fg">{r.error}</p>
      ) : null}
      <DialogoRechazar
        abierto={rechazar}
        cantidad={1}
        pendiente={r.pendiente}
        error={r.error}
        onCerrar={() => setRechazar(false)}
        onRechazar={async (motivo) => {
          if (await r.rechazar([id], motivo)) listo();
        }}
      />
    </div>
  );
}
