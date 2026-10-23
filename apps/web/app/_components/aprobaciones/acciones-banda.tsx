"use client";

import { useState } from "react";

import { Button } from "@opai/ds";

import { DialogoRechazar } from "@/app/(erp)/configuracion/aprobaciones/rechazar";
import { useResolver } from "@/app/(erp)/configuracion/aprobaciones/use-resolver";

/** Rechazar / Aprobar desde la banda de una ficha (45); la página se refresca al resolver. */
export function AccionesBanda({ id }: { id: string }) {
  const [rechazar, setRechazar] = useState(false);
  const r = useResolver();
  return (
    <>
      <Button variant="secondary" onClick={() => setRechazar(true)}>
        Rechazar
      </Button>
      <Button disabled={r.pendiente} onClick={() => void r.aprobar([id])}>
        Aprobar
      </Button>
      <DialogoRechazar
        abierto={rechazar}
        cantidad={1}
        pendiente={r.pendiente}
        error={r.error}
        onCerrar={() => setRechazar(false)}
        onRechazar={async (motivo) => {
          if (await r.rechazar([id], motivo)) setRechazar(false);
        }}
      />
    </>
  );
}
