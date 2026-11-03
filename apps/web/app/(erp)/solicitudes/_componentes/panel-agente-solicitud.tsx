import { Sparkles } from "lucide-react";

import { Badge, SeccionTarjeta, Timeline } from "@opai/ds";

import type { AccionAgenteDato, SolicitudDato } from "./datos";
import { fecha } from "@/lib/fechas";

/** Cabecera y bloques extra del diseño 03 (canal agente). */
export function PanelAgenteSolicitud({
  s,
  acciones,
}: {
  s: SolicitudDato;
  acciones: AccionAgenteDato[];
}) {
  if (s.canal !== "agente") return null;
  const responsable = acciones.find((a) => a.responsableNombre)?.responsableNombre;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tono="neutro" punto={false}>
          Registrada por OPAI
        </Badge>
        {responsable ? (
          <span className="t-body-sm text-[var(--ds-fg-muted)]">a pedido de {responsable}</span>
        ) : null}
      </div>
      {acciones.length ? (
        <SeccionTarjeta titulo="Historial del agente">
          <Timeline
            items={acciones.map((a) => ({
              id: a.id,
              actor: {
                nombre: a.apiKeyNombre ?? "Agente",
                agente: true,
              },
              accion: a.resumen,
              cuando: fecha(a.creadaEn),
              meta: a.responsableNombre ? `vía ${a.responsableNombre}` : undefined,
              conTipo: true,
            }))}
          />
        </SeccionTarjeta>
      ) : null}
    </>
  );
}

export function MarcaCampoAgente({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Sparkles
      className="size-4 shrink-0 text-[var(--ds-fg-muted)]"
      aria-label="Propuesto por el agente"
    />
  );
}

export function tituloDatosAgente(s: SolicitudDato) {
  if (s.canal !== "agente") return { titulo: "Datos detectados", desc: undefined as string | undefined };
  return {
    titulo: "Datos propuestos",
    desc: "Generados por un agente desde la conversación. Revísalos antes de convertir.",
  };
}

export function esCampoAgente(s: SolicitudDato, campo: string) {
  return s.canal === "agente" && s.camposPropuestosAgente.includes(campo);
}
