"use client";

import { lazy, Suspense, useState } from "react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha } from "@/lib/fechas";

import { etiquetaTipo, type GrupoAusencia } from "./tipos";

const DialogoConfirmar = lazy(() =>
  import("@/app/_components/maestros/dialogo-confirmar").then((m) => ({
    default: m.DialogoConfirmar,
  })),
);

/** Anula un registro de la persona (CAR-393): si marcaba turnos, vuelven a la serie; no toca a otras personas. */
export function AnularAusencia({ personaId, g }: { personaId: string; g: GrupoAusencia }) {
  const [abierto, setAbierto] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function anular() {
    const r = await ejecutar("core.ausencias.anular", { personaId, ausenciaId: g.ausenciaId });
    if (r) {
      avisar.exito("Registro anulado");
      setAbierto(false);
    }
  }
  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        Anular
      </Button>
      {abierto ? (
        <Suspense fallback={null}>
          <DialogoConfirmar
            confirmacion={{
              titulo: `Anular ${etiquetaTipo(g.tipo).toLowerCase()}`,
              descripcion: `Del ${fecha(g.desde)} al ${fecha(g.hasta)}.${g.dias > 0 ? " Sus turnos vuelven a su serie en la pauta." : ""} Queda en el historial.`,
              boton: "Anular",
              peligro: true,
            }}
            pendiente={pendiente}
            error={error}
            onCerrar={() => setAbierto(false)}
            onConfirmar={anular}
          />
        </Suspense>
      ) : null}
    </>
  );
}
