"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alerta, Button, Empty, Popover, Punto, Skeleton } from "@opai/ds";

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

/** Campana de avisos: carga las notificaciones al abrir el panel. */
export function Campana({ portal, pendiente = false }: { portal: string; pendiente?: boolean }) {
  return <CampanaAvisos portal={portal} pendienteInicial={pendiente} />;
}

function CampanaAvisos({ portal, pendienteInicial }: { portal: string; pendienteInicial: boolean }) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [noLeidas, setNoLeidas] = useState<number | null>(null);
  const [error, setError] = useState(false);
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
  const pendiente = noLeidas === null ? pendienteInicial : noLeidas > 0 || (aprobaciones ?? 0) > 0;
  async function cargar() {
    setError(false);
    const r = await ejecutarCapacidad(portal, "core.notificaciones.list", { limite: 20 });
    if (r.ok) {
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos(d.items);
      setNoLeidas(d.noLeidas);
    } else {
      setAvisos([]);
      setError(true);
    }
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
        {error ? (
          <Alerta tono="danger" titulo="No pudimos cargar las notificaciones" />
        ) : avisos === null ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : avisos.length === 0 ? (
          <Empty titulo="Sin avisos por ahora" />
        ) : (
          <ListaAvisos avisos={avisos} portal={portal} />
        )}
      </div>
    </Popover>
  );
}
