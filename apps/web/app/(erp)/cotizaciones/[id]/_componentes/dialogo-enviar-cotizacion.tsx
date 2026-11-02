"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, ChipToggle, Dialog, Input, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Contacto = { id: string; nombres: string; apellidos: string; email: string | null };

export function DialogoEnviarCotizacion({
  cotizacionId,
  codigo,
  version,
  cuentaId,
  requiereAprobacion,
  estado,
  onCerrar,
  onEnviado,
}: {
  cotizacionId: string;
  codigo: string;
  version: number;
  cuentaId: string | null;
  requiereAprobacion: boolean;
  estado: string;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactoId, setContactoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState(
    "Hola: te adjunto la cotización actualizada. Quedo atento a tus comentarios.",
  );

  useEffect(() => {
    if (!cuentaId) return;
    void ejecutar("core.contactos.list", { cuentaId }).then((r) => {
      if (Array.isArray(r)) {
        const items = r as Contacto[];
        const conCorreo = items.filter((c) => c.email?.trim());
        setContactos(conCorreo);
        if (conCorreo[0]) setContactoId(conCorreo[0].id);
      }
    });
  }, [cuentaId, ejecutar]);

  const contacto = contactos.find((c) => c.id === contactoId);
  const pedirAprobacion = requiereAprobacion && estado !== "lista";

  async function confirmar() {
    if (pedirAprobacion) {
      const r = await ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId });
      if (r != null) {
        avisar.exito("Aprobación solicitada");
        onEnviado();
        onCerrar();
      }
      return;
    }
    if (!contactoId) return;
    const r = await ejecutar("cpq.cotizaciones.enviar", {
      id: cotizacionId,
      contactoId,
      mensaje,
    });
    if (r != null) {
      avisar.exito("Cotización enviada");
      onEnviado();
      onCerrar();
    }
  }

  return (
    <Dialog abierto titulo="Enviar al contacto" onCerrar={onCerrar}>
      <div className="space-y-4 p-1">
        <p className="t-body-sm text-fg-muted">
          Se envía {codigo} v{version} en PDF con la plantilla y marca vigentes del tenant.
        </p>
        {!cuentaId ? (
          <Alerta tono="warning" titulo="Sin cuenta">
            El negocio no tiene cuenta; no hay contactos para enviar.
          </Alerta>
        ) : null}
        <Campo etiqueta="Para">
          <div className="flex flex-wrap gap-2">
            {contactos.map((c) => (
              <ChipToggle
                key={c.id}
                etiqueta={`${c.nombres} ${c.apellidos}`}
                activo={c.id === contactoId}
                onCambiar={(activo) => {
                  if (activo) setContactoId(c.id);
                }}
              />
            ))}
          </div>
          {contacto?.email ? (
            <p className="t-caption text-fg-muted mt-1">{contacto.email}</p>
          ) : (
            <p className="t-caption text-warning-fg mt-1">Elige un contacto con correo.</p>
          )}
        </Campo>
        <Campo etiqueta="Asunto" htmlFor="cpq-asunto">
          <Input id="cpq-asunto" readOnly value={`Cotización ${codigo}`} />
        </Campo>
        <Campo etiqueta="Mensaje" htmlFor="cpq-mensaje">
          <Textarea id="cpq-mensaje" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </Campo>
        {pedirAprobacion ? (
          <Alerta tono="info" titulo="Requiere aprobación">
            La cotización queda pendiente; un owner o admin revisa el margen y recién ahí sale el correo.
          </Alerta>
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || (!pedirAprobacion && !contactoId)} onClick={() => void confirmar()}>
            {pedirAprobacion ? "Solicitar aprobación" : "Enviar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
