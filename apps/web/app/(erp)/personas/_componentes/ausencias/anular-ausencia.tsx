"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha } from "@/lib/fechas";

import { etiquetaTipo, type GrupoAusencia } from "./tipos";

/** Anula un registro de la persona: sus turnos vuelven a la serie; no toca a otras personas. */
export function AnularAusencia({ personaId, g }: { personaId: string; g: GrupoAusencia }) {
  const [abierto, setAbierto] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function anular() {
    const r = await ejecutar("pauta.ausencias.anular", {
      personaId,
      tipo: g.tipo,
      desde: g.desde,
      hasta: g.hasta,
    });
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
        <DialogoConfirmar
          confirmacion={{
            titulo: `Anular ${etiquetaTipo(g.tipo).toLowerCase()}`,
            descripcion: `Del ${fecha(g.desde)} al ${fecha(g.hasta)}: los turnos vuelven a su serie en la pauta. Queda en el historial.`,
            boton: "Anular",
            peligro: true,
          }}
          pendiente={pendiente}
          error={error}
          onCerrar={() => setAbierto(false)}
          onConfirmar={anular}
        />
      ) : null}
    </>
  );
}
