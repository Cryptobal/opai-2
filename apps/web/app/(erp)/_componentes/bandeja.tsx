"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { Aviso } from "@/app/_components/campana";
import { ListaAvisos } from "@/app/_components/lista-avisos";
import { BandejaCorta } from "./bandeja-corta";
import { conPlazo } from "./con-plazo";

/** Una sola Bandeja; el servidor aplica destinatario, permisos efectivos y tenant. */
export function Bandeja({ corta = false }: { corta?: boolean }) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [aprobaciones, setAprobaciones] = useState<number | null>(null);
  const [decisiones, setDecisiones] = useState<{ id: string; resumen: string }[]>([]);
  const [error, setError] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const cargar = useCallback(async () => {
    setError(false);
    try {
      // Las dos lecturas van juntas y una acción de servidor que se cuelga o rechaza (corte de red,
      // despliegue nuevo) deja la tarjeta en error, nunca en esqueleto para siempre (B12).
      const [r, c] = await Promise.all([
        conPlazo(
          ejecutarCapacidad("erp", "core.notificaciones.list", { limite: 50, soloNoLeidas: true }),
        ),
        conPlazo(
          ejecutarCapacidad("erp", "core.resumen.contadores", { campos: ["aprobacionesPendientes"] }),
        ),
      ]);
      if (r.ok) {
        const d = r.data as { items: Aviso[]; noLeidas: number };
        setAvisos(d.items.filter((a) => !a.leidaEn));
        setNoLeidas(d.noLeidas);
      } else {
        setAvisos([]);
        setError(true);
      }
      if (c.ok) {
        const total = (c.data as { aprobacionesPendientes: number | null }).aprobacionesPendientes;
        setAprobaciones(total);
        // null significa sin permiso: no se solicita la lista para viewer/supervisor.
        if (total !== null && total > 0) {
          const [a, cpq] = await Promise.all([
            conPlazo(ejecutarCapacidad("erp", "core.aprobaciones.list", { estado: "pendiente" })),
            conPlazo(ejecutarCapacidad("erp", "cpq.aprobaciones.list", { limite: 5 })),
          ]);
          const agente = a.ok ? (a.data as { id: string; resumen: string }[]) : [];
          const cpqItems = cpq.ok
            ? (cpq.data as { id: string; resumen: string }[]).map((x) => ({
                id: x.id,
                resumen: x.resumen,
              }))
            : [];
          setDecisiones([...agente, ...cpqItems].slice(0, 5));
        } else setDecisiones([]);
      }
    } catch {
      setAvisos((prev) => prev ?? []);
      setError(true);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(cargar);
    const actualizar = () => void cargar();
    window.addEventListener("opai-bandeja", actualizar);
    return () => window.removeEventListener("opai-bandeja", actualizar);
  }, [cargar]);
  async function cargarMas() {
    const ultimo = avisos?.at(-1);
    if (!ultimo || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await ejecutarCapacidad("erp", "core.notificaciones.list", {
        limite: 50,
        soloNoLeidas: true,
        antesDe: ultimo.id,
      });
      if (!r.ok) {
        setError(true);
        return;
      }
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos((prev) => [
        ...(prev ?? []),
        ...d.items.filter((a) => !prev?.some((p) => p.id === a.id)),
      ]);
      setNoLeidas(d.noLeidas);
    } finally {
      setCargandoMas(false);
    }
  }
  async function marcar() {
    const r = await ejecutarCapacidad("erp", "core.notificaciones.marcar_todas", {});
    if (!r.ok) {
      setError(true);
      return;
    }
    await cargar();
    window.dispatchEvent(new Event("opai-bandeja"));
  }
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
