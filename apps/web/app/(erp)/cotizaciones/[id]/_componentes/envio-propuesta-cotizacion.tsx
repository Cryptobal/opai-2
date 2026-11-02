"use client";

import { Button, Checkbox, Campo, Input } from "@opai/ds";
import { useState } from "react";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

export function EnvioPropuestaCotizacion({
  cotizacionId,
  propuestaId,
  gestionar,
  aprobarEnvios,
  puedeEnviar,
}: {
  cotizacionId: string;
  propuestaId: string | null;
  gestionar: boolean;
  aprobarEnvios: boolean;
  puedeEnviar: boolean;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [incluyeCotizacion, setIncluyeCotizacion] = useState(true);
  const [incluyePropuesta, setIncluyePropuesta] = useState(Boolean(propuestaId));
  const [email, setEmail] = useState("contacto@test.cl");
  const [envioPendienteId, setEnvioPendienteId] = useState<string | null>(null);

  if (!gestionar) return null;

  async function solicitar() {
    const r = await ejecutar("cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion,
      incluyePropuesta,
      ...(propuestaId && incluyePropuesta ? { propuestaTecnicaId: propuestaId } : {}),
      destinatarios: [{ email: email.trim() }],
    });
    if (r && typeof r === "object" && "envioId" in r) {
      setEnvioPendienteId(String((r as { envioId: string }).envioId));
    }
  }

  async function aprobar() {
    if (!envioPendienteId) return;
    await ejecutar("cpq.envios_propuesta.aprobar", { envioId: envioPendienteId });
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
      <p className="t-label">Envío y aprobación</p>
      <Checkbox etiqueta="Cotización PDF" marcado={incluyeCotizacion} onCambiar={setIncluyeCotizacion} />
      <Checkbox
        etiqueta="Propuesta técnica"
        marcado={incluyePropuesta}
        onCambiar={setIncluyePropuesta}
        disabled={!propuestaId}
      />
      {!propuestaId ? (
        <p className="t-caption text-fg-muted">
          <LinkNext href={`/cotizaciones/${cotizacionId}/propuesta-tecnica`} className="text-accent">
            Armar propuesta técnica
          </LinkNext>{" "}
          para incluirla en el envío.
        </p>
      ) : null}
      <Campo etiqueta="Correo destinatario" htmlFor="envio-email">
        <Input id="envio-email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pendiente || !puedeEnviar} onClick={() => void solicitar()}>
          Solicitar envío
        </Button>
        {aprobarEnvios && envioPendienteId ? (
          <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void aprobar()}>
            Aprobar envío
          </Button>
        ) : null}
      </div>
      <p className="t-caption text-fg-muted">Ningún correo sale sin aprobación humana con permiso Aprobar envíos.</p>
    </div>
  );
}
