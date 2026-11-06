"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button, Empty } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { type HechoLocal, leerCola, pedirEnvio } from "@/lib/terreno/cola";
import { instantanea, instantaneaServidor, refrescarEstado, suscribir } from "@/lib/terreno/estado";

import { BannerConexion } from "./banner-conexion";

const ETIQUETA: Record<string, string> = {
  "terreno.latido": "Aviso de que el teléfono estuvo activo",
};
const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Cola sin conexión (g6): lo que está guardado en este teléfono y todavía no llegó al servidor. */
export function ColaPendiente() {
  const e = useSyncExternalStore(suscribir, instantanea, instantaneaServidor);
  const [hechos, setHechos] = useState<HechoLocal[] | null>(null);
  useEffect(() => {
    let vivo = true;
    void leerCola().then((c) => vivo && setHechos(c));
    return () => {
      vivo = false;
    };
  }, [e.pendientes]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-safe pb-safe py-6">
      <header>
        <LinkNext href="/terreno" className="text-sm text-fg-muted underline">
          Volver al inicio
        </LinkNext>
        <h1 className="t-h1 mt-1 text-fg">Cola sin conexión</h1>
        <p className="text-base text-fg-muted">
          {e.pendientes === 1 ? "1 hecho por enviar" : `${e.pendientes} hechos por enviar`}
        </p>
      </header>
      <BannerConexion conVerCola={false} />
      {hechos && hechos.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {hechos.map((h) => (
            <li
              key={h.clave}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="text-base text-fg">{ETIQUETA[h.tipo] ?? h.tipo}</span>
              <span className="t-mono text-sm text-fg-muted">{hora(h.horaHecho)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          titulo="Nada por enviar"
          descripcion="Todo lo que capturaste ya llegó al servidor."
        />
      )}
      <p className="text-sm text-fg-muted">
        La hora es la de tu teléfono al momento de capturar. Si cierras la app, los hechos quedan
        guardados y se envían cuando vuelva la señal.
      </p>
      <Button
        onClick={() => {
          void pedirEnvio().then(refrescarEstado);
        }}
        disabled={e.pendientes === 0 || !e.enLinea}
      >
        Reintentar ahora
      </Button>
    </main>
  );
}
