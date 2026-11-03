"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import { Copy, Eye, GitBranch, MoreHorizontal, Send } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, type ItemMenu, Menu } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesCotizacionExtras } from "./acciones-cotizacion-extras";
import {
  accionPrimariaCpq,
  bloqueoEnvioCpq,
  pedirAprobacionDeshabilitada,
  type MetaAccionesCpq,
} from "./acciones-cotizacion-logica";
import { BloqueoCotizacion } from "./bloqueo-cotizacion";
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
  ocultarPrimariaEnTelefono,
}: {
  cotizacionId: string;
  version: { estado: string; editable?: boolean };
  calculo: { requiereAprobacion?: boolean; noEnviable?: boolean; advertencias?: string[] };
  meta?: MetaAccionesCpq;
  gestionar: boolean;
  aprobar: boolean;
  onHecho: () => void;
  onEnviar?: () => void;
  onVistaPrevia?: () => void;
  /** Barra fija móvil: solo acción primaria o aviso de bloqueo. */
  soloPrimaria?: boolean;
  /** Cabecera: en teléfono la primaria va solo en la barra fija. */
  ocultarPrimariaEnTelefono?: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [rechazoAbierto, setRechazoAbierto] = useState(false);
  if (!gestionar && !aprobar) return null;

  const params = {
    version,
    calculo,
    gestionar,
    ...(meta !== undefined ? { meta } : {}),
  };
  const bloqueada = version.estado === "en_aprobacion";
  const puedeDecidir = Boolean(meta?.puedeAprobarMargen);
  const motivoBloqueo = meta?.motivoNoAprobarMargen ?? null;
  const muestraAprobacion = aprobar && bloqueada && (puedeDecidir || motivoBloqueo);
  const primaria = accionPrimariaCpq(params);
  const bloqueo = bloqueoEnvioCpq(params);
  const pedirDeshabilitada = pedirAprobacionDeshabilitada(params);
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

  const recalcular = () => {
    limpiarError();
    void ejecutar("cpq.cotizaciones.calcular", { id: cotizacionId }).then(despues);
  };

  if (soloPrimaria) {
    if (bloqueo) {
      return (
        <BloqueoCotizacion
          mensaje={bloqueo.mensaje}
          laboralPendiente={bloqueo.laboralPendiente}
          pendiente={pendiente}
          onRecalcular={recalcular}
          {...(bloqueo.enlace ? { enlace: bloqueo.enlace } : {})}
        />
      );
    }
    if (!primaria) return null;
    return (
      <Button
        type="button"
        variant={primaria.variant === "secondary" ? "secondary" : "primary"}
        disabled={pendiente}
        className="w-full"
        onClick={() => void ejecutarPrimaria()}
      >
        {primaria.id === "enviar" ? <Send className="size-4" aria-hidden /> : null}
        {primaria.etiqueta}
      </Button>
    );
  }

  const itemsMenu: ItemMenu[] = [];
  if (onVistaPrevia) {
    itemsMenu.push({
      id: "preview-pdf",
      etiqueta: "Vista previa PDF",
      icono: Eye,
      onSelect: onVistaPrevia,
    });
  }
  if (gestionar) {
    itemsMenu.push({
      id: "clonar",
      etiqueta: "Clonar",
      icono: Copy,
      onSelect: () => {
        limpiarError();
        void ejecutar("cpq.cotizaciones.clonar", { id: cotizacionId }).then((r) => {
          if (r != null) onHecho();
        });
      },
    });
    if (puedeNuevaVersion) {
      itemsMenu.push({
        id: "nueva-version",
        etiqueta: "Nueva versión",
        icono: GitBranch,
        onSelect: () => {
          limpiarError();
          void ejecutar("cpq.versiones.crear", { cotizacionId }).then((r) => r != null && onHecho());
        },
      });
    }
  }

  const botonPrimario = pedirDeshabilitada ? (
    <Button
      type="button"
      disabled
      title={bloqueo?.mensaje}
      className={ocultarPrimariaEnTelefono ? "hidden md:inline-flex" : undefined}
    >
      Pedir aprobación
    </Button>
  ) : primaria ? (
    <Button
      type="button"
      variant={primaria.variant === "secondary" ? "secondary" : "primary"}
      disabled={pendiente}
      className={ocultarPrimariaEnTelefono ? "hidden md:inline-flex" : undefined}
      onClick={() => void ejecutarPrimaria()}
    >
      {primaria.id === "enviar" ? <Send className="size-4" aria-hidden /> : null}
      {primaria.etiqueta}
    </Button>
  ) : null;

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-2">
        {bloqueo ? (
          <div className={ocultarPrimariaEnTelefono ? "hidden md:block" : undefined}>
            <BloqueoCotizacion
              mensaje={bloqueo.mensaje}
              laboralPendiente={bloqueo.laboralPendiente}
              pendiente={pendiente}
              onRecalcular={recalcular}
              {...(bloqueo.enlace ? { enlace: bloqueo.enlace } : {})}
            />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {botonPrimario}
          {!ocultarPrimariaEnTelefono && onVistaPrevia ? (
            <Button type="button" variant="secondary" disabled={pendiente} onClick={onVistaPrevia}>
              <Eye className="size-4" aria-hidden />
              Vista previa PDF
            </Button>
          ) : null}
          {gestionar && !ocultarPrimariaEnTelefono ? (
            <AccionesCotizacionExtras
              cotizacionId={cotizacionId}
              puedeNuevaVersion={puedeNuevaVersion}
              pendiente={pendiente}
              ejecutar={ejecutar}
              limpiarError={limpiarError}
              onHecho={onHecho}
            />
          ) : null}
          {ocultarPrimariaEnTelefono && itemsMenu.length > 0 ? (
            <div className="md:hidden">
              <Menu
                etiqueta="Más acciones de la cotización"
                items={itemsMenu}
                disparador={<MoreHorizontal className="size-5" aria-hidden />}
                claseDisparador="border border-border-strong bg-surface size-11"
              />
            </div>
          ) : null}
          {muestraAprobacion ? (
            <>
              <Button
                type="button"
                disabled={pendiente || !puedeDecidir}
                title={!puedeDecidir ? (motivoBloqueo ?? undefined) : undefined}
                className={ocultarPrimariaEnTelefono ? "hidden md:inline-flex" : undefined}
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
                className={ocultarPrimariaEnTelefono ? "hidden md:inline-flex" : undefined}
                onClick={() => setRechazoAbierto(true)}
              >
                Rechazar
              </Button>
            </>
          ) : null}
          {ocultarPrimariaEnTelefono ? (
            <div className="hidden md:contents">
              {onVistaPrevia ? (
                <Button type="button" variant="secondary" disabled={pendiente} onClick={onVistaPrevia}>
                  <Eye className="size-4" aria-hidden />
                  Vista previa PDF
                </Button>
              ) : null}
              {gestionar ? (
                <AccionesCotizacionExtras
                  cotizacionId={cotizacionId}
                  puedeNuevaVersion={puedeNuevaVersion}
                  pendiente={pendiente}
                  ejecutar={ejecutar}
                  limpiarError={limpiarError}
                  onHecho={onHecho}
                />
              ) : null}
            </div>
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
