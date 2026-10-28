"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { Aviso } from "@/app/_components/campana";
import { ListaAvisos } from "@/app/_components/lista-avisos";

/** Una sola Bandeja; el servidor aplica destinatario, permisos efectivos y tenant. */
export function Bandeja() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [aprobaciones, setAprobaciones] = useState<number | null>(null);
  const [decisiones, setDecisiones] = useState<{ id: string; resumen: string }[]>([]);
  const [error, setError] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const cargar = useCallback(async () => {
    setError(false);
    const r = await ejecutarCapacidad("erp", "core.notificaciones.list", {
      limite: 50,
      soloNoLeidas: true,
    });
    const c = await ejecutarCapacidad("erp", "core.resumen.contadores", {
      campos: ["aprobacionesPendientes"],
    });
    if (r.ok) {
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos(d.items.filter((a) => !a.leidaEn));
      setNoLeidas(d.noLeidas);
    }
    else {
      setAvisos([]);
      setError(true);
    }
    if (c.ok) {
      const total = (c.data as { aprobacionesPendientes: number | null }).aprobacionesPendientes;
      setAprobaciones(total);
      // null significa sin permiso: no se solicita la lista para viewer/supervisor.
      if (total !== null && total > 0) {
        const a = await ejecutarCapacidad("erp", "core.aprobaciones.list", { estado: "pendiente" });
        if (a.ok) setDecisiones((a.data as { id: string; resumen: string }[]).slice(0, 5));
      } else setDecisiones([]);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(cargar);
  }, [cargar]);
  async function cargarMas() {
    const ultimo = avisos?.at(-1);
    if (!ultimo || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await ejecutarCapacidad("erp", "core.notificaciones.list", {
        limite: 50, soloNoLeidas: true,
        antesDe: ultimo.id,
      });
      if (!r.ok) { setError(true); return; }
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos((prev) => [...(prev ?? []), ...d.items.filter((a) => !prev?.some((p) => p.id === a.id))]);
      setNoLeidas(d.noLeidas);
    } finally { setCargandoMas(false); }
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
  return (
    <section id="bandeja" className="scroll-mt-20">
      <SeccionTarjeta
        titulo={`Bandeja${avisos ? ` · ${noLeidas + (aprobaciones ?? 0)}` : ""}`}
      >
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
                href={`/configuracion/aprobaciones?id=${d.id}`}
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
            {!avisos.length && !aprobaciones ? (
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
