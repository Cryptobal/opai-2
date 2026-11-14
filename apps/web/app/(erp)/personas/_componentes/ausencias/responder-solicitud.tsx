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

type Respuesta = "aprobar" | "rechazar";

/**
 * Aprueba o rechaza una solicitud que la persona hizo desde su portal (CAR-508). Aprobar la registra como cualquier
 * ausencia y, con Pauta, marca sus turnos; rechazar solo la cierra. La persona ve la respuesta en su portal.
 */
export function ResponderSolicitud({
  personaId,
  g,
  conPauta,
}: {
  personaId: string;
  g: GrupoAusencia;
  conPauta: boolean;
}) {
  const [abierto, setAbierto] = useState<Respuesta | null>(null);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function responder() {
    if (!abierto) return;
    const input = { personaId, ausenciaId: g.ausenciaId };
    const r =
      abierto === "aprobar"
        ? await ejecutar("core.ausencias.aprobar", input)
        : await ejecutar("core.ausencias.rechazar", input);
    if (r) {
      avisar.exito(abierto === "aprobar" ? "Solicitud aprobada" : "Solicitud rechazada");
      setAbierto(null);
    }
  }
  const tipo = etiquetaTipo(g.tipo).toLowerCase();
  const fechas =
    g.desde === g.hasta ? `El ${fecha(g.desde)}.` : `Del ${fecha(g.desde)} al ${fecha(g.hasta)}.`;
  return (
    <span className="flex flex-none gap-1">
      <Button variant="ghost" onClick={() => setAbierto("rechazar")}>
        Rechazar
      </Button>
      <Button variant="secondary" onClick={() => setAbierto("aprobar")}>
        Aprobar
      </Button>
      {abierto ? (
        <Suspense fallback={null}>
          <DialogoConfirmar
            confirmacion={
              abierto === "aprobar"
                ? {
                    titulo: `Aprobar ${tipo}`,
                    descripcion: `${fechas}${conPauta ? " Sus turnos de esas fechas quedan por cubrir en la pauta." : ""} La persona lo ve en su portal.`,
                    boton: "Aprobar",
                  }
                : {
                    titulo: `Rechazar ${tipo}`,
                    descripcion: `${fechas} La persona lo ve en su portal y puede pedirlo de nuevo.`,
                    boton: "Rechazar",
                    peligro: true,
                  }
            }
            pendiente={pendiente}
            error={error}
            onCerrar={() => setAbierto(null)}
            onConfirmar={responder}
          />
        </Suspense>
      ) : null}
    </span>
  );
}
