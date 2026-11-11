"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ListaAvisos } from "@/app/_components/lista-avisos";
import { AprobacionesPendientes } from "./aprobaciones-pendientes";
import { BandejaCorta } from "./bandeja-corta";
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
      <SeccionTarjeta titulo={`Bandeja${avisos ? ` · ${noLeidas + (aprobaciones ?? 0) + tareasSeguimiento}` : ""}`}>
        {error ? <Alerta tono="danger" titulo="No pudimos actualizar la Bandeja" /> : null}
        {avisos === null ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="flex flex-col gap-3">
            {aprobaciones !== null && aprobaciones > 0 ? (
              <AprobacionesPendientes total={aprobaciones} decisiones={decisiones} />
            ) : null}
            <ListaAvisos avisos={avisos} portal="erp" onLeida={() => void cargar()} />
            {avisos.length < noLeidas ? (
              <Button variant="secondary" disabled={cargandoMas} onClick={() => void cargarMas()}>
                Cargar más avisos
              </Button>
            ) : null}
            {!avisos.length && !aprobaciones && !error ? (
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
