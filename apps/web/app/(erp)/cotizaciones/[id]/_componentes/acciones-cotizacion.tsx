"use client";

import { Send } from "lucide-react";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { resumenRecalculo } from "@/lib/cpq-recalculo";

import { AccionesCotizacionBarraFija } from "./acciones-cotizacion-barra-fija";
import { AccionesCotizacionCabecera } from "./acciones-cotizacion-cabecera";
import {
  accionPrimariaCpq,
  bloqueoCalculoEnBarraFija,
  bloqueoEnvioCpq,
  bloqueoMutualCpq,
  pedirAprobacionDeshabilitada,
  type MetaAccionesCpq,
} from "./acciones-cotizacion-logica";
import { itemsMenuCotizacion } from "./acciones-cotizacion-menu";
import { BloqueoCotizacion } from "./bloqueo-cotizacion";

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
  onEditarLinea,
  soloPrimaria,
  ocultarPrimariaEnTelefono,
}: {
  cotizacionId: string;
  version: { estado: string; editable?: boolean };
  calculo: Parameters<typeof bloqueoEnvioCpq>[0]["calculo"];
  meta?: MetaAccionesCpq;
  gestionar: boolean;
  aprobar: boolean;
  onHecho: () => void;
  onEnviar?: () => void;
  onVistaPrevia?: () => void;
  /** Abre la hoja de edición de una línea (aviso de sueldo faltante, CAR-162). */
  onEditarLinea?: (lineaId: string) => void;
  soloPrimaria?: boolean;
  ocultarPrimariaEnTelefono?: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  if (!gestionar && !aprobar) return null;

  const params = { version, calculo, gestionar, ...(meta !== undefined ? { meta } : {}) };
  const puedeDecidir = Boolean(meta?.puedeAprobarMargen);
  const motivoBloqueo = meta?.motivoNoAprobarMargen ?? null;
  const muestraAprobacion =
    aprobar && version.estado === "en_aprobacion" && Boolean(puedeDecidir || motivoBloqueo);
  const primaria = accionPrimariaCpq(params);
  const bloqueoMutual = bloqueoMutualCpq(params);
  const bloqueo = bloqueoEnvioCpq(params) ?? bloqueoMutual;
  const bloqueoCalculoBarra = bloqueoCalculoEnBarraFija(params);
  const puedeNuevaVersion =
    gestionar && version.estado !== "borrador" && version.estado !== "en_aprobacion";
  const ocultar = Boolean(ocultarPrimariaEnTelefono);
  const despues = (r: unknown) => void (r != null && (limpiarError(), onHecho()));
  // Recalcular informa qué cambió o qué falta (CAR-162), no solo recarga.
  const recalcular = () => {
    limpiarError();
    void ejecutar<typeof calculo>("cpq.cotizaciones.calcular", { id: cotizacionId }).then((r) => {
      if (r == null) return;
      const { tono, texto } = resumenRecalculo(calculo, r);
      avisar[tono](texto);
      despues(r);
    });
  };

  async function ejecutarPrimaria() {
    if (!primaria) return;
    limpiarError();
    if (primaria.id === "enviar") return onEnviar?.();
    if (primaria.id === "preview") return onVistaPrevia?.();
    if (primaria.id === "recalcular") return recalcular();
    if (primaria.id === "pedir") {
      despues(await ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId }));
    } else {
      despues(await ejecutar("cpq.cotizaciones.marcar_lista", { id: cotizacionId }));
    }
  }

  const avisoBloqueo = (b: NonNullable<typeof bloqueo>) => (
    <BloqueoCotizacion
      bloqueo={b}
      pendiente={pendiente}
      onRecalcular={recalcular}
      {...(onEditarLinea ? { onEditarLinea } : {})}
    />
  );
  const botonPrimaria = (clase?: string) =>
    primaria ? (
      <Button
        type="button"
        variant={primaria.variant === "secondary" ? "secondary" : "primary"}
        disabled={pendiente}
        className={clase}
        onClick={() => void ejecutarPrimaria()}
      >
        {primaria.id === "enviar" ? <Send className="size-4" aria-hidden /> : null}
        {primaria.etiqueta}
      </Button>
    ) : null;

  if (soloPrimaria) {
    return (
      <AccionesCotizacionBarraFija
        bloqueoCalculo={bloqueoCalculoBarra}
        bloqueoMutual={bloqueoMutual}
        avisoBloqueo={avisoBloqueo}
        botonPrimaria={botonPrimaria}
      />
    );
  }

  const comunes = { cotizacionId, gestionar, puedeNuevaVersion, onVistaPrevia, ejecutar, limpiarError, onHecho };

  return (
    <AccionesCotizacionCabecera
      bloqueo={bloqueo}
      ocultar={ocultar}
      pedirDeshabilitado={pedirAprobacionDeshabilitada(params)}
      botonPrimaria={botonPrimaria}
      extrasProps={{ ...comunes, pendiente }}
      items={itemsMenuCotizacion(comunes)}
      avisoBloqueo={avisoBloqueo}
      aprobacion={{
        cotizacionId,
        visible: muestraAprobacion,
        puedeDecidir,
        motivoBloqueo,
        pendiente,
        error,
        ocultarEnTelefono: ocultar,
        ejecutar,
        limpiarError,
        onHecho,
      }}
      error={error}
    />
  );
}
