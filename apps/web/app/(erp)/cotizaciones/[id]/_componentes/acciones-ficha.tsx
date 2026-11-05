"use client";

import { MoreHorizontal, Send } from "lucide-react";

import { Alerta, avisar, Button, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { RUTA_CONFIRMAR_MUTUAL } from "@/lib/cpq-avisos";
import { resumenRecalculo } from "@/lib/cpq-recalculo";

import { AccionesAprobacionMargen } from "./acciones-cotizacion-aprobacion";
import { itemsMenuCotizacion } from "./acciones-cotizacion-menu";
import type { MetaFicha } from "./meta-ficha";

type Calculo = Parameters<typeof resumenRecalculo>[0];

/**
 * Una sola acción primaria (la del estado único del servidor) y el resto en un menú «Más» (CAR-192).
 * Lo que se ofrece es lo que la capacidad acepta: `meta.estadoFicha.siguiente` sale de la misma
 * función que usan `marcar_lista`, pedir aprobación y enviar.
 */
export function AccionesFicha(p: {
  cotizacionId: string;
  meta: MetaFicha | undefined;
  calculo: Calculo;
  gestionar: boolean;
  aprobar: boolean;
  onHecho: () => void;
  onEnviar: () => void;
  onVistaPrevia: () => void;
  onCompletar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const { meta, cotizacionId } = p;
  const accion = meta?.estadoFicha?.siguiente.accion ?? "ninguna";
  const despues = (r: unknown) => void (r != null && (limpiarError(), p.onHecho()));

  const recalcular = () =>
    void ejecutar<Calculo>("cpq.cotizaciones.calcular", { id: cotizacionId }).then((r) => {
      if (r == null) return;
      const { tono, texto } = resumenRecalculo(p.calculo, r);
      avisar[tono](texto);
      despues(r);
    });
  const pedirAprobacion = () => {
    limpiarError();
    void ejecutar("cpq.cotizaciones.solicitar_aprobacion", { id: cotizacionId }).then(despues);
  };
  const dejarLista = () => {
    limpiarError();
    void ejecutar("cpq.cotizaciones.marcar_lista", { id: cotizacionId }).then(despues);
  };

  let primaria: React.ReactNode = null;
  if (p.gestionar && meta?.estadoFicha) {
    const etiqueta = meta.estadoFicha.siguiente.etiqueta;
    if (accion === "completar") primaria = <Button type="button" onClick={p.onCompletar}>{etiqueta}</Button>;
    else if (accion === "recalcular") primaria = <Button type="button" disabled={pendiente} onClick={recalcular}>{etiqueta}</Button>;
    else if (accion === "pedir_aprobacion")
      primaria = <Button type="button" disabled={pendiente} onClick={pedirAprobacion}>{etiqueta}</Button>;
    else if (accion === "dejar_lista")
      primaria = <Button type="button" disabled={pendiente} onClick={dejarLista}>{etiqueta}</Button>;
    else if (accion === "enviar")
      primaria = meta.requiereConfirmarMutual ? (
        <EnlaceBoton href={RUTA_CONFIRMAR_MUTUAL}>Confirmar mutual para enviar</EnlaceBoton>
      ) : (
        <Button type="button" disabled={pendiente} onClick={p.onEnviar}>
          <Send className="size-4" aria-hidden />
          {etiqueta}
        </Button>
      );
  }
  const items = itemsMenuCotizacion({
    cotizacionId,
    gestionar: p.gestionar,
    puedeNuevaVersion: Boolean(meta?.puedeCrearVersion),
    puedeReabrir: Boolean(meta?.puedeReabrir),
    onVistaPrevia: p.onVistaPrevia,
    ejecutar,
    limpiarError,
    onHecho: p.onHecho,
  });
  const decide = p.aprobar && accion === "esperar" && Boolean(meta?.puedeAprobarMargen || meta?.motivoNoAprobarMargen);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {primaria}
        <AccionesAprobacionMargen
          cotizacionId={cotizacionId}
          visible={decide}
          puedeDecidir={Boolean(meta?.puedeAprobarMargen)}
          motivoBloqueo={meta?.motivoNoAprobarMargen ?? null}
          pendiente={pendiente}
          error={error}
          ocultarEnTelefono={false}
          ejecutar={ejecutar}
          limpiarError={limpiarError}
          onHecho={p.onHecho}
        />
        {items.length > 0 ? (
          <Menu
            etiqueta="Más acciones de la cotización"
            items={items}
            disparador={<MoreHorizontal className="size-5" aria-hidden />}
            claseDisparador="border border-border-strong bg-surface size-11"
          />
        ) : null}
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
    </div>
  );
}
