"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button, Popover, Punto, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

// La lista de avisos solo se descarga al abrir la campana (ADR-037).
const ListaAvisos = dynamic(() => import("./lista-avisos").then((m) => m.ListaAvisos));

export type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  leidaEn: string | null;
  creadaEn: string;
};

/**
 * Campana (D6, ADR-014): punto de no leído, sin número (el número vive dentro de la Bandeja), que
 * abre la misma Bandeja de Inicio (avisos y, con `aprobaciones:manage`, las pendientes) — no hay
 * una segunda lista. El resumen se pide al montar con `core.resumen.contadores` (ADR-045: un solo
 * conteo liviano, no en la carga de servidor de cada navegación); los avisos se descargan al abrir.
 */
export function Campana({ portal, pendiente = false }: { portal: string; pendiente?: boolean }) {
  if (portal === "erp")
    return (
      <Link
        href="/#bandeja"
        aria-label={pendiente ? "Notificaciones, hay avisos sin leer" : "Notificaciones"}
        className="relative flex size-11 flex-none items-center justify-center rounded-md text-fg-muted outline-none hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Bell className="size-5" aria-hidden />
        <Punto visible={pendiente} />
      </Link>
    );
  return <CampanaAvisos portal={portal} />;
}

function CampanaAvisos({ portal }: { portal: string }) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);
  const [aprobaciones, setAprobaciones] = useState<number | null>(null);
  useEffect(() => {
    let activo = true;
    void ejecutarCapacidad(portal, "core.resumen.contadores", {
      campos: ["notificacionesNoLeidas", "aprobacionesPendientes"],
    }).then((r) => {
      if (!activo || !r.ok) return;
      const d = r.data as {
        notificacionesNoLeidas: number | null;
        aprobacionesPendientes: number | null;
      };
      setNoLeidas(d.notificacionesNoLeidas ?? 0);
      setAprobaciones(d.aprobacionesPendientes);
    });
    return () => {
      activo = false;
    };
  }, [portal]);
  const pendiente = noLeidas > 0 || (aprobaciones ?? 0) > 0;
  async function cargar() {
    const r = await ejecutarCapacidad(portal, "core.notificaciones.list", { limite: 20 });
    if (r.ok) {
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos(d.items);
      setNoLeidas(d.noLeidas);
    } else setAvisos([]);
  }
  async function marcarTodas() {
    await ejecutarCapacidad(portal, "core.notificaciones.marcar_todas", {});
    setNoLeidas(0);
    setAvisos(
      (l) => l?.map((a) => ({ ...a, leidaEn: a.leidaEn ?? new Date().toISOString() })) ?? null,
    );
  }
  return (
    <Popover
      etiqueta="Notificaciones"
      onCambiar={(a) => a && void cargar()}
      disparador={
        <Button
          variant="ghost"
          size="icon"
          aria-label={pendiente ? "Notificaciones, hay avisos sin leer" : "Notificaciones"}
          className="relative"
        >
          <Bell className="size-5" />
          <Punto visible={pendiente} />
        </Button>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="t-label">Notificaciones</p>
        {noLeidas ? (
          <Button variant="ghost" className="h-9" onClick={() => void marcarTodas()}>
            Marcar todas
          </Button>
        ) : null}
      </div>
      {aprobaciones ? (
        <Link
          href="/configuracion/aprobaciones"
          className="block border-b border-border px-4 py-3 text-base font-medium text-accent hover:bg-fill"
        >
          {aprobaciones} {aprobaciones === 1 ? "aprobación" : "aprobaciones"} pendiente
          {aprobaciones === 1 ? "" : "s"}
        </Link>
      ) : null}
      <div className="max-h-96 overflow-y-auto">
        {avisos === null ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : avisos.length === 0 ? (
          <p className="px-4 py-8 text-center text-base text-fg-muted">Sin avisos por ahora</p>
        ) : (
          <ListaAvisos avisos={avisos} portal={portal} />
        )}
      </div>
    </Popover>
  );
}
