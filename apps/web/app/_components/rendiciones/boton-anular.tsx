"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Dialog } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { BASE, type PortalRendicion } from "./tipos";

/** Anular una rendición propia que aún no se decide; queda en el historial. */
export function BotonAnular({
  portal,
  id,
  codigo,
}: {
  portal: PortalRendicion;
  id: string;
  codigo: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function anular() {
    setOcupado(true);
    setError(null);
    const r = await ejecutarCapacidad(portal, "rendiciones.rendiciones.anular", { id });
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito(`${codigo} anulada`);
    router.push(BASE[portal]);
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Anular
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`¿Anular ${codigo}?`}
        descripcion="Dejará de contar y no se puede deshacer. El código no se reutiliza."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)} disabled={ocupado}>
              Volver
            </Button>
            <Button onClick={() => void anular()} disabled={ocupado}>
              {ocupado ? "Anulando…" : "Anular rendición"}
            </Button>
          </>
        }
      >
        {error ? (
          <p role="alert" className="text-base font-medium text-danger-fg">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
