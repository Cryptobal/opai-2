"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, ChipToggle, Input, Sheet, Textarea } from "@opai/ds";

import { DialogoMutual } from "@/app/(erp)/configuracion/remuneraciones/dialogo-mutual";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { EnviarBloqueos } from "./enviar-bloqueos";
import { EnviarVistaPrevia } from "./enviar-vista-previa";
import { OpcionSeguimiento, useSeguimientoAlEnviar } from "./opcion-seguimiento";
import { useContactosEnvio } from "./use-contactos-envio";

const MENSAJE = "Hola: te adjunto la cotización actualizada. Quedo atento a tus comentarios.";

/** Hoja de envío (CPQ v4): bloqueos y avisos, vista previa con adjuntos, destinatario y mensaje. */
export function HojaEnviarCotizacion(p: {
  cotizacionId: string;
  codigo: string;
  version: number;
  cuentaId: string | null;
  /** Con el negocio se ofrece iniciar el seguimiento al enviar. */
  negocioId?: string | null;
  requiereAprobacion: boolean;
  requiereMutual: boolean;
  margenTexto: string | null;
  estado: string;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const seguimiento = useSeguimientoAlEnviar(p.negocioId ?? null);
  const { contactos, contactoId, setContactoId, contacto, cargando } = useContactosEnvio(p.cuentaId);
  const [mensaje, setMensaje] = useState(MENSAJE);
  const [propuestaId, setPropuestaId] = useState<string | null>(null);
  const [conPropuesta, setConPropuesta] = useState(false);
  const [mutualOk, setMutualOk] = useState(false);
  const [mutualAbierta, setMutualAbierta] = useState(false);

  useEffect(() => {
    void ejecutar("cpq.propuestas_tecnica.get", { cotizacionId: p.cotizacionId }, false, "ninguna").then((r) => {
      if (r && typeof r === "object" && "id" in r) setPropuestaId(String((r as { id: string }).id));
    });
  }, [p.cotizacionId, ejecutar]);

  const pedirAprobacion = p.requiereAprobacion && p.estado !== "lista";
  const mutualPendiente = p.requiereMutual && !mutualOk;
  const bloqueado = !pedirAprobacion && (mutualPendiente || !contacto?.email || !seguimiento.listo);

  async function confirmar() {
    if (pedirAprobacion) {
      const r = await ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: p.cotizacionId });
      if (r != null) {
        avisar.exito("Aprobación solicitada");
        p.onEnviado();
        p.onCerrar();
      }
      return;
    }
    if (!contacto?.email) return;
    const r = await ejecutar("cpq.envios_propuesta.solicitar", {
      cotizacionId: p.cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: conPropuesta && propuestaId !== null,
      ...(conPropuesta && propuestaId ? { propuestaTecnicaId: propuestaId } : {}),
      destinatarios: [{ email: contacto.email.trim(), contactoId, nombre: `${contacto.nombres} ${contacto.apellidos}`.trim() }],
      mensaje,
    });
    if (r != null) {
      const e = typeof r === "object" && "estado" in r ? String((r as { estado: string }).estado) : null;
      if (e !== "pendiente_aprobacion") await seguimiento.arrancar(p.cotizacionId, p.codigo);
      avisar.exito(e === "pendiente_aprobacion" ? "Envío pendiente de aprobación" : "Cotización enviada");
      p.onEnviado();
      p.onCerrar();
    }
  }

  const etiqueta = pedirAprobacion ? "Solicitar aprobación" : contacto ? `Enviar a ${contacto.nombres}` : "Enviar";
  return (
    <Sheet
      abierto
      titulo="Enviar cotización"
      descripcion={`${p.codigo} · v${p.version}`}
      onCerrar={p.onCerrar}
      acciones={
        <Button type="button" disabled={pendiente || bloqueado} onClick={() => void confirmar()}>
          {etiqueta}
        </Button>
      }
    >
      <div className="space-y-5">
        <EnviarBloqueos
          mutualPendiente={mutualPendiente}
          onConfirmarMutual={() => setMutualAbierta(true)}
          requiereAprobacion={pedirAprobacion}
          margenTexto={p.margenTexto}
        />
        <EnviarVistaPrevia cotizacionId={p.cotizacionId} conPropuesta={conPropuesta} hayPropuesta={propuestaId !== null} onConPropuesta={setConPropuesta} />
        {!p.cuentaId ? <Alerta tono="warning" titulo="Sin cuenta">El negocio no tiene cuenta; no hay contactos para enviar.</Alerta> : null}
        <Campo etiqueta="Para">
          <div className="flex flex-wrap gap-2">
            {contactos.map((c) => (
              <ChipToggle key={c.id} etiqueta={`${c.nombres} ${c.apellidos}`} activo={c.id === contactoId} onCambiar={(a) => a && setContactoId(c.id)} />
            ))}
          </div>
          {contacto?.email ? (
            <p className="t-caption mt-1 text-fg-muted">{contacto.email}</p>
          ) : p.cuentaId && !cargando ? (
            <p className="t-caption mt-1 text-warning-fg">La cuenta no tiene contactos con correo.</p>
          ) : null}
        </Campo>
        <Campo etiqueta="Asunto" htmlFor="cpq-asunto">
          <Input id="cpq-asunto" readOnly value={`Cotización ${p.codigo}`} />
        </Campo>
        <Campo etiqueta="Mensaje" htmlFor="cpq-mensaje">
          <Textarea id="cpq-mensaje" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </Campo>
        {!pedirAprobacion ? <OpcionSeguimiento s={seguimiento} /> : null}
        {pedirAprobacion ? (
          <Alerta tono="info" titulo="Requiere aprobación">
            La cotización queda pendiente; un owner o admin revisa el margen y recién ahí sale el correo.
          </Alerta>
        ) : null}
        {!pedirAprobacion && !seguimiento.listo ? <p className="t-caption text-center text-fg-muted">Elige la etapa del negocio para enviar.</p> : null}
        {mutualPendiente && !pedirAprobacion ? <p className="t-caption text-center text-fg-muted">Confirma la mutual adicional para enviar.</p> : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
      {mutualAbierta ? (
        <DialogoMutual
          abierto
          tasaActual={null}
          onCerrar={() => setMutualAbierta(false)}
          onGuardada={() => {
            setMutualOk(true);
            setMutualAbierta(false);
            p.onEnviado();
          }}
        />
      ) : null}
    </Sheet>
  );
}
