"use client";

import Link from "next/link";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { haceCuanto } from "@/lib/fechas";

import type { Aviso } from "./campana";

/** Filas de la campana: título, cuerpo y "hace cuánto"; el enlace marca el aviso como leído. */
export function ListaAvisos({
  avisos,
  portal,
  onLeida,
  onNavegar,
}: {
  avisos: Aviso[];
  portal: string;
  onLeida?: () => void;
  /** Se llama al pulsar un aviso con enlace (la campana cierra su panel). */
  onNavegar?: () => void;
}) {
  return (
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
            {a.cuerpo ? <span className="block text-sm text-fg-muted">{a.cuerpo}</span> : null}
            <span className="t-caption block">{haceCuanto(a.creadaEn)}</span>
          </>
        );
        return (
          <li key={a.id}>
            {a.enlace ? (
              <Link
                href={a.enlace}
                className="block px-4 py-3 hover:bg-fill dark:hover:bg-bg"
                onClick={() => {
                  onNavegar?.();
                  void ejecutarCapacidad(portal, "core.notificaciones.marcar_leida", {
                    id: a.id,
                  }).then((r) => {
                    if (!r.ok) return;
                    window.dispatchEvent(new Event("opai-bandeja"));
                    onLeida?.();
                  });
                }}
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
  );
}
