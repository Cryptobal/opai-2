"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import Link from "next/link";

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ListaAvisos } from "@/app/_components/lista-avisos";
import { BandejaCorta } from "./bandeja-corta";
import { useBandeja } from "./use-bandeja";

/** Una sola Bandeja; el servidor aplica destinatario, permisos efectivos y tenant. */
export function Bandeja({ corta = false }: { corta?: boolean }) {
  const { avisos, aprobaciones, decisiones, error, noLeidas, cargandoMas, cargar, cargarMas, marcar } =
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
      />
    );
  return (
    <section id="bandeja" className="scroll-mt-20">
      <SeccionTarjeta titulo={`Bandeja${avisos ? ` · ${noLeidas + (aprobaciones ?? 0)}` : ""}`}>
        {error ? <Alerta tono="danger" titulo="No pudimos actualizar la Bandeja" /> : null}
        {avisos === null ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="flex flex-col gap-3">
            {aprobaciones !== null && aprobaciones > 0 ? (
              <Link
                href="/configuracion/aprobaciones"
                className="flex min-h-11 items-center text-accent"
              >
                {aprobaciones} aprobaciones pendientes
              </Link>
            ) : null}
            {decisiones.map((d) => (
              <Link
                key={d.id}
                href={`/configuracion/aprobaciones?ver=${encodeURIComponent(d.id)}`}
                className="flex min-h-11 items-center text-fg"
              >
                {d.resumen}
              </Link>
            ))}
            <ListaAvisos avisos={avisos} portal="erp" onLeida={() => void cargar()} />
            {avisos.length < noLeidas ? (
              <Button variant="secondary" disabled={cargandoMas} onClick={() => void cargarMas()}>
                Cargar más avisos
              </Button>
            ) : null}
            {!avisos.length && !aprobaciones && !error ? (
              <p className="t-body text-fg-muted">Todo al día. No tienes nada pendiente.</p>
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
