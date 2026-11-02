"use client";

import { Button, Checkbox, Campo, Input, Select } from "@opai/ds";
import { useEffect, useMemo, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

type ContactoCuenta = { id: string; nombre: string; email: string | null; esPrincipal: boolean };

type Destinatario = { email: string; contactoId?: string; nombre?: string };

export function EnvioPropuestaCotizacion({
  cotizacionId,
  cuentaId,
  propuestaId,
  gestionar,
  aprobarEnvios,
  puedeEnviar,
}: {
  cotizacionId: string;
  cuentaId: string | null;
  propuestaId: string | null;
  gestionar: boolean;
  aprobarEnvios: boolean;
  puedeEnviar: boolean;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [incluyeCotizacion, setIncluyeCotizacion] = useState(true);
  const [incluyePropuesta, setIncluyePropuesta] = useState(Boolean(propuestaId));
  const [contactos, setContactos] = useState<ContactoCuenta[]>([]);
  const [contactoSel, setContactoSel] = useState("");
  const [emailsExtra, setEmailsExtra] = useState("");
  const [envioPendienteId, setEnvioPendienteId] = useState<string | null>(null);

  useEffect(() => {
    if (!cuentaId) return;
    void ejecutar("core.cuentas.contactos", { cuentaId }).then((r) => {
      if (!Array.isArray(r)) return;
      const lista: ContactoCuenta[] = r
        .filter((c) => c.email?.trim())
        .map((c) => ({
          id: c.contactoId,
          nombre: `${c.nombres} ${c.apellidos}`.trim(),
          email: c.email,
          esPrincipal: c.esPrincipal,
        }));
      setContactos(lista);
      const principal = lista.find((c) => c.esPrincipal) ?? lista[0];
      if (principal) setContactoSel(principal.id);
    });
  }, [cuentaId, ejecutar]);

  const destinatarios = useMemo((): Destinatario[] => {
    const out: Destinatario[] = [];
    const c = contactos.find((x) => x.id === contactoSel);
    if (c?.email) out.push({ email: c.email.trim(), contactoId: c.id, nombre: c.nombre });
    for (const raw of emailsExtra.split(/[\n,;]+/)) {
      const email = raw.trim();
      if (!email) continue;
      if (out.some((d) => d.email.toLowerCase() === email.toLowerCase())) continue;
      out.push({ email });
    }
    return out;
  }, [contactoSel, contactos, emailsExtra]);

  if (!gestionar) return null;

  async function solicitar() {
    if (!destinatarios.length) return;
    const r = await ejecutar("cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion,
      incluyePropuesta,
      ...(propuestaId && incluyePropuesta ? { propuestaTecnicaId: propuestaId } : {}),
      destinatarios,
    });
    if (r && typeof r === "object" && "envioId" in r) {
      setEnvioPendienteId(String((r as { envioId: string }).envioId));
    }
  }

  async function aprobar() {
    if (!envioPendienteId) return;
    await ejecutar("cpq.envios_propuesta.aprobar", { envioId: envioPendienteId });
  }

  async function cancelar() {
    if (!envioPendienteId) return;
    await ejecutar("cpq.envios_propuesta.cancelar", { envioId: envioPendienteId });
    setEnvioPendienteId(null);
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
      {cuentaId ? (
        <Campo etiqueta="Contacto principal" htmlFor="envio-contacto">
          <Select
            id="envio-contacto"
            valor={contactoSel}
            onCambiar={setContactoSel}
            opciones={contactos.map((c) => ({ valor: c.id, etiqueta: `${c.nombre} · ${c.email}` }))}
          />
        </Campo>
      ) : (
        <p className="t-caption text-fg-muted">La cotización no tiene cuenta; agrega correos manuales abajo.</p>
      )}
      <Campo etiqueta="Otros correos (opcional)" htmlFor="envio-emails-extra" ayuda="Separados por coma o salto de línea">
        <Input
          id="envio-emails-extra"
          value={emailsExtra}
          onChange={(e) => setEmailsExtra(e.target.value)}
          placeholder="otro@cliente.cl"
        />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pendiente || !puedeEnviar || !destinatarios.length} onClick={() => void solicitar()}>
          Solicitar envío
        </Button>
        {aprobarEnvios && envioPendienteId ? (
          <>
            <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void aprobar()}>
              Aprobar envío
            </Button>
            <Button type="button" variant="ghost" disabled={pendiente} onClick={() => void cancelar()}>
              Cancelar solicitud
            </Button>
          </>
        ) : null}
      </div>
      <p className="t-caption text-fg-muted">Ningún correo sale sin aprobación humana con permiso Aprobar envíos.</p>
    </div>
  );
}
