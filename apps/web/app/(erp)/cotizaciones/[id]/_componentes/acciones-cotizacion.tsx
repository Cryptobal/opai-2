"use client";

import { Eye, Send } from "lucide-react";
import { useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesCotizacionExtras } from "./acciones-cotizacion-extras";
import { accionPrimariaCpq, type MetaAccionesCpq } from "./acciones-cotizacion-logica";
import { DialogoRechazarAprobacion } from "./dialogo-rechazar-aprobacion";

export function AccionesCotizacion({
  cotizacionId,
  version,
  calculo,
  meta,
  gestionar,
  aprobar,
  onHecho,
  onEnviar,
  onVistaPrevia,
  soloPrimaria,
}: {
  cotizacionId: string;
  version: { estado: string; editable?: boolean };
  calculo: { requiereAprobacion?: boolean; noEnviable?: boolean };
  meta?: MetaAccionesCpq;
  gestionar: boolean;
  aprobar: boolean;
  onHecho: () => void;
  onEnviar?: () => void;
  onVistaPrevia?: () => void;
  soloPrimaria?: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [rechazoAbierto, setRechazoAbierto] = useState(false);
  if (!gestionar && !aprobar) return null;
  const bloqueada = version.estado === "en_aprobacion";
  const puedeDecidir = Boolean(meta?.puedeAprobarMargen);
  const motivoBloqueo = meta?.motivoNoAprobarMargen ?? null;
  const muestraAprobacion = aprobar && bloqueada && (puedeDecidir || motivoBloqueo);
  const primaria = accionPrimariaCpq({ version, calculo, gestionar, ...(meta !== undefined ? { meta } : {}) });
  const puedeNuevaVersion = gestionar && version.estado !== "borrador" && version.estado !== "en_aprobacion";

  async function despues(r: unknown) {
    if (r != null) {
      limpiarError();
      onHecho();
    }
  }

  async function ejecutarPrimaria() {
    if (!primaria) return;
    limpiarError();
    if (primaria.id === "enviar") {
      onEnviar?.();
      return;
    }
    if (primaria.id === "preview") {
      onVistaPrevia?.();
      return;
    }
    if (primaria.id === "pedir") {
      await ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId }).then(despues);
    } else if (primaria.id === "lista") {
      await ejecutar("cpq.cotizaciones.marcar_lista", { id: cotizacionId }).then(despues);
    } else if (primaria.id === "recalcular") {
      await ejecutar("cpq.cotizaciones.calcular", { id: cotizacionId }).then(despues);
    }
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {primaria ? (
            <Button
              type="button"
              variant={primaria.variant === "secondary" ? "secondary" : "primary"}
              disabled={pendiente}
              onClick={() => void ejecutarPrimaria()}
            >
              {primaria.id === "enviar" ? <Send className="size-4" aria-hidden /> : null}
              {primaria.etiqueta}
            </Button>
          ) : null}
          {!soloPrimaria && onVistaPrevia ? (
            <Button type="button" variant="secondary" disabled={pendiente} onClick={onVistaPrevia}>
              <Eye className="size-4" aria-hidden />
              Vista previa PDF
            </Button>
          ) : null}
          {gestionar && !soloPrimaria ? (
            <AccionesCotizacionExtras
              cotizacionId={cotizacionId}
              puedeNuevaVersion={puedeNuevaVersion}
              pendiente={pendiente}
              ejecutar={ejecutar}
              limpiarError={limpiarError}
              onHecho={onHecho}
            />
          ) : null}
          {muestraAprobacion ? (
            <>
              <Button
                type="button"
                disabled={pendiente || !puedeDecidir}
                title={!puedeDecidir ? (motivoBloqueo ?? undefined) : undefined}
                onClick={() => {
                  limpiarError();
                  void ejecutar("cpq.cotizaciones.aprobar", { id: cotizacionId }).then(despues);
                }}
              >
                Aprobar margen
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pendiente || !puedeDecidir}
                onClick={() => setRechazoAbierto(true)}
              >
                Rechazar
              </Button>
            </>
          ) : null}
        </div>
        {error ? <Alerta tono="danger" titulo={error} className="w-full max-w-xl" /> : null}
      </div>
      <DialogoRechazarAprobacion
        abierto={rechazoAbierto}
        pendiente={pendiente}
        error={error}
        onCerrar={() => setRechazoAbierto(false)}
        onConfirmar={(motivo) => {
          limpiarError();
          void ejecutar("cpq.cotizaciones.rechazar_aprobacion", { id: cotizacionId, motivo }).then((r) => {
            if (r != null) {
              setRechazoAbierto(false);
              onHecho();
            }
          });
        }}
      />
    </>
  );
}
