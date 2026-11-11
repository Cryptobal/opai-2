"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ListaAvisos } from "@/app/_components/lista-avisos";
import { useConteoNovedades } from "@/app/_components/novedades/use-conteo-novedades";
import { AprobacionesPendientes } from "./aprobaciones-pendientes";
import { BandejaCorta } from "./bandeja-corta";
import { NovedadesBandeja } from "./novedades-bandeja";
import { useBandeja } from "./use-bandeja";

/** Una sola Bandeja; el servidor aplica destinatario, permisos efectivos y tenant. */
export function Bandeja({
  corta = false,
  onNavegar,
}: {
  corta?: boolean;
  onNavegar?: () => void;
}) {
  const { avisos, aprobaciones, tareasSeguimiento, decisiones, error, noLeidas, cargandoMas, cargar, cargarMas, marcar } =
    useBandeja();
  // Novedades sin leer (CAR-316): solo en la Bandeja completa; la campana sigue con sus avisos.
  const novedades = useConteoNovedades("erp", undefined, !corta);
  if (corta)
    return (
      <BandejaCorta
        avisos={avisos}
        aprobaciones={aprobaciones}
        decisiones={decisiones}
        error={error}
        onMarcar={() => void marcar()}
        onLeida={() => void cargar()}
        {...(onNavegar ? { onNavegar } : {})}
      />
    );
  return (
    <section id="bandeja" className="scroll-mt-20">
      <SeccionTarjeta titulo={`Bandeja${avisos ? ` · ${noLeidas + (aprobaciones ?? 0) + tareasSeguimiento + novedades}` : ""}`}>
        {error ? <Alerta tono="danger" titulo="No pudimos actualizar la Bandeja" /> : null}
        {avisos === null ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="flex flex-col gap-3">
            <NovedadesBandeja noLeidas={novedades} />
            {aprobaciones !== null && aprobaciones > 0 ? (
              <AprobacionesPendientes total={aprobaciones} decisiones={decisiones} />
            ) : null}
            <ListaAvisos avisos={avisos} portal="erp" onLeida={() => void cargar()} />
            {avisos.length < noLeidas ? (
              <Button variant="secondary" disabled={cargandoMas} onClick={() => void cargarMas()}>
                Cargar más avisos
              </Button>
            ) : null}
            {!avisos.length && !aprobaciones && !novedades && !error ? (
              <p className="t-body text-fg-muted">Todo al día. No tienes avisos ni aprobaciones pendientes.</p>
            ) : null}
            {avisos.length ? (
              <Button variant="secondary" onClick={() => void marcar()}>
                Marcar todas como leídas
              </Button>
            ) : null}
          </div>
        )}
      </SeccionTarjeta>
    </section>
  );
}
