"use client";

import { Alerta, Button, Campo, Checkbox, Input } from "@opai/ds";

import { TEXTO_ACEPTACION } from "./firmar-constantes";
import type { useFirmaN1 } from "./use-firma-n1";

type FirmaUi = ReturnType<typeof useFirmaN1>;

function FormRechazo({ ui, idSuffix }: { ui: FirmaUi; idSuffix: string }) {
  const motivoId = `firma-motivo${idSuffix}`;
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Motivo del rechazo" htmlFor={motivoId}>
        <Input id={motivoId} value={ui.motivo} onChange={(e) => ui.setMotivo(e.target.value)} />
      </Campo>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => ui.setRechazando(false)}>
          Volver
        </Button>
        <Button
          variant="destructive"
          disabled={ui.enviando || ui.motivo.trim().length < 3}
          onClick={() => void ui.confirmarRechazo()}
        >
          {ui.enviando ? "Rechazando…" : "Confirmar rechazo"}
        </Button>
      </div>
    </div>
  );
}

const AVISO_HUELLA = (
  <p className="t-caption">
    Revisa el documento completo antes de firmar. La huella del documento congelado se compara con la que recibiste;
    cambiarlo cancela esta solicitud (R4).
  </p>
);

function CamposFirma({ ui, idSuffix, etiquetaNombre, avisoHuella }: { ui: FirmaUi; idSuffix: string; etiquetaNombre: string; avisoHuella?: boolean }) {
  const nombreId = `firma-nombre${idSuffix}`;
  return (
    <>
      {avisoHuella !== false ? AVISO_HUELLA : null}
      <Campo etiqueta={etiquetaNombre} htmlFor={nombreId}>
        <Input id={nombreId} value={ui.nombre} onChange={(e) => ui.setNombre(e.target.value)} autoComplete="name" />
      </Campo>
      <Checkbox etiqueta={TEXTO_ACEPTACION} marcado={ui.acepta} onCambiar={ui.setAcepta} />
    </>
  );
}

export function FirmaN1Botones({ ui }: { ui: FirmaUi }) {
  return (
  <>
      <Button disabled={ui.enviando || !ui.acepta || ui.nombre.trim().length < 2} onClick={() => void ui.confirmarFirma()}>
        {ui.enviando ? "Firmando…" : "Firmar"}
      </Button>
      <Button variant="secondary" disabled={ui.enviando} onClick={() => ui.setRechazando(true)}>
        Rechazar
      </Button>
  </>
  );
}

/** Bloque portal: ver documento + campos + botones en columna. */
export function FirmaN1Campos({ ui, idSuffix = "" }: { ui: FirmaUi; idSuffix?: string }) {
  if (ui.rechazando) return <FormRechazo ui={ui} idSuffix={idSuffix} />;
  return (
    <>
      <CamposFirma ui={ui} idSuffix={idSuffix} etiquetaNombre="Nombre con el que firmas" avisoHuella />
      <div className="flex flex-col gap-2 sm:flex-row">
        <FirmaN1Botones ui={ui} />
      </div>
    </>
  );
}

/** Bloque enlace público (AuthCard): sin botones de acción dentro. */
export function FirmaN1CamposEnlace({
  ui,
  idSuffix,
  verDocumento,
}: {
  ui: FirmaUi;
  idSuffix: string;
  verDocumento: React.ReactNode;
}) {
  if (ui.rechazando) return <FormRechazo ui={ui} idSuffix={idSuffix} />;
  return (
    <>
      {AVISO_HUELLA}
      {verDocumento}
      <CamposFirma ui={ui} idSuffix={idSuffix} etiquetaNombre="Tu nombre" avisoHuella={false} />
    </>
  );
}

export function FirmaN1AlertaSinAccion({ ui }: { ui: FirmaUi }) {
  return (
    <Alerta tono={ui.firmado ? "success" : "info"} titulo={ui.firmado ? "Listo" : "Sin acción pendiente"}>
      {ui.firmado
        ? "Tu firma quedó registrada. Si corresponde, recibirás el documento firmado por correo."
        : "La solicitud ya no está vigente (firmada, rechazada, vencida o cancelada)."}
    </Alerta>
  );
}