"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import type { Aviso } from "@/app/_components/campana";

/** Una sola Bandeja; el servidor aplica destinatario, permisos efectivos y tenant. */
export function Bandeja() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [aprobaciones, setAprobaciones] = useState<number | null>(null);
  const [decisiones, setDecisiones] = useState<{ id: string; resumen: string }[]>([]);
  const [error, setError] = useState(false);
  const cargar = useCallback(async () => {
    const r = await ejecutarCapacidad("erp", "core.notificaciones.list", {
      limite: 50,
      soloNoLeidas: true,
    });
    const c = await ejecutarCapacidad("erp", "core.resumen.contadores", {
      campos: ["aprobacionesPendientes"],
    });
    if (r.ok) setAvisos((r.data as { items: Aviso[] }).items.filter((a) => !a.leidaEn));
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
        titulo={`Bandeja${avisos ? ` · ${avisos.length + (aprobaciones ?? 0)}` : ""}`}
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
            {avisos.map((a) => (
              <div key={a.id} className="border-b border-border py-2">
                <p className="t-label">{a.titulo}</p>
                {a.cuerpo ? <p className="t-body-sm text-fg-muted">{a.cuerpo}</p> : null}
              </div>
            ))}
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
