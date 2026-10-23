"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, Popover, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { haceCuanto } from "@/lib/fechas";

type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  leidaEn: string | null;
  creadaEn: string;
};

/** Campana con contador real (`core.notificaciones.*`): los avisos se cargan al abrir. */
export function Campana({ noLeidas, portal }: { noLeidas: number; portal: string }) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [pendientes, setPendientes] = useState(noLeidas);
  async function cargar() {
    const r = await ejecutarCapacidad(portal, "core.notificaciones.list", { limite: 20 });
    if (r.ok) {
      const d = r.data as { items: Aviso[]; noLeidas: number };
      setAvisos(d.items);
      setPendientes(d.noLeidas);
    } else setAvisos([]);
  }
  async function marcarTodas() {
    await ejecutarCapacidad(portal, "core.notificaciones.marcar_todas", {});
    setPendientes(0);
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
          aria-label={pendientes ? `${pendientes} notificaciones sin leer` : "Notificaciones"}
          className="relative"
        >
          <Bell className="size-5" />
          {pendientes ? (
            <span className="t-numeric absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[11px] leading-none font-semibold text-white shadow-[0_0_0_2px_var(--ds-surface)] dark:bg-danger dark:text-inverse-fg">
              {pendientes > 99 ? "99+" : pendientes}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="t-label">Notificaciones</p>
        {pendientes ? (
          <Button variant="ghost" className="h-9" onClick={() => void marcarTodas()}>
            Marcar todas
          </Button>
        ) : null}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {avisos === null ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : avisos.length === 0 ? (
          <p className="px-4 py-8 text-center text-base text-fg-muted">Sin avisos por ahora</p>
        ) : (
          <ul className="divide-y divide-border">
            {avisos.map((a) => {
              const cuerpo = (
                <>
                  <span className="flex items-start gap-2">
                    {a.leidaEn ? null : (
                      <span
                        aria-label="sin leer"
                        className="mt-1.5 size-2 flex-none rounded-full bg-accent"
                      />
                    )}
                    <span className="min-w-0 flex-1 text-base font-medium text-fg">{a.titulo}</span>
                  </span>
                  {a.cuerpo ? (
                    <span className="block text-sm text-fg-muted">{a.cuerpo}</span>
                  ) : null}
                  <span className="t-caption block">{haceCuanto(a.creadaEn)}</span>
                </>
              );
              return (
                <li key={a.id}>
                  {a.enlace ? (
                    <Link
                      href={a.enlace}
                      className="block px-4 py-3 hover:bg-bg"
                      onClick={() =>
                        void ejecutarCapacidad(portal, "core.notificaciones.marcar_leida", {
                          id: a.id,
                        })
                      }
                    >
                      {cuerpo}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{cuerpo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Popover>
  );
}
