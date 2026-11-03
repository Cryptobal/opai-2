"use client";

import { MoreHorizontal, Send } from "lucide-react";

import { Alerta, avisar, Button, Menu } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { resumenRecalculo } from "@/lib/cpq-recalculo";

import { AccionesAprobacionMargen } from "./acciones-cotizacion-aprobacion";
import { AccionesCotizacionExtras } from "./acciones-cotizacion-extras";
import {
  accionPrimariaCpq,
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
  /** Barra fija móvil: solo acción primaria o aviso de bloqueo. */
  soloPrimaria?: boolean;
  /** Cabecera: en teléfono la primaria va solo en la barra fija. */
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
  const bloqueo = bloqueoEnvioCpq(params) ?? bloqueoMutualCpq(params);
  const bloqueoCalculo = bloqueoEnvioCpq(params);
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
    const id =
      primaria.id === "pedir"
        ? "cpq.cotizaciones.solicitar_aprobacion"
        : "cpq.cotizaciones.marcar_lista";
    despues(await ejecutar(id, { id: cotizacionId }));
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

  if (soloPrimaria) return bloqueoCalculo ? avisoBloqueo(bloqueoCalculo) : botonPrimaria("w-full");

  const claseTelefono = ocultar ? "hidden md:inline-flex" : undefined;
  const comunes = { cotizacionId, gestionar, puedeNuevaVersion, onVistaPrevia, ejecutar, limpiarError, onHecho };
  const items = itemsMenuCotizacion(comunes);
  const extras = <AccionesCotizacionExtras {...comunes} pendiente={pendiente} />;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {bloqueo ? (
        <div className={ocultar ? "hidden md:block" : undefined}>{avisoBloqueo(bloqueo)}</div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {pedirAprobacionDeshabilitada(params) ? (
          <Button type="button" disabled title={bloqueo?.mensaje} className={claseTelefono}>
            Pedir aprobación
          </Button>
        ) : (
          botonPrimaria(claseTelefono)
        )}
        {ocultar ? null : extras}
        {ocultar && items.length > 0 ? (
          <div className="md:hidden">
            <Menu
              etiqueta="Más acciones de la cotización"
              items={items}
              disparador={<MoreHorizontal className="size-5" aria-hidden />}
              claseDisparador="border border-border-strong bg-surface size-11"
            />
          </div>
        ) : null}
        <AccionesAprobacionMargen
          cotizacionId={cotizacionId}
          visible={muestraAprobacion}
          puedeDecidir={puedeDecidir}
          motivoBloqueo={motivoBloqueo}
          pendiente={pendiente}
          error={error}
          ocultarEnTelefono={ocultar}
          ejecutar={ejecutar}
          limpiarError={limpiarError}
          onHecho={onHecho}
        />
        {ocultar ? <div className="hidden md:contents">{extras}</div> : null}
      </div>
      {error ? <Alerta tono="danger" titulo={error} className="w-full max-w-xl" /> : null}
    </div>
  );
}
