"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Button, Empty } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { ResumenCola } from "@/lib/terreno/cola";
import { TIPOS_SILENCIOSOS } from "@/lib/terreno/silenciosos";
import { instantanea, instantaneaServidor, refrescarEstado, suscribir } from "@/lib/terreno/estado";

import { BannerConexion } from "./banner-conexion";
// Las listas se cargan aparte para no pesar en el JS inicial de la ruta (presupuesto de JS, ADR-037/044).
// La cola local se carga aparte, igual que las listas, para no pesar en el JS inicial.
const cola = () => import("@/lib/terreno/cola");
const ListaPendientes = dynamic(() => import("./cola-lista").then((m) => m.ListaPendientes), {
  ssr: false,
});
const ListaRechazados = dynamic(() => import("./cola-lista").then((m) => m.ListaRechazados), {
  ssr: false,
});
const ListaSincronizados = dynamic(() => import("./cola-lista").then((m) => m.ListaSincronizados), {
  ssr: false,
});
const SeccionCola = dynamic(() => import("./cola-lista").then((m) => m.SeccionCola), {
  ssr: false,
});

/**
 * Cola sin conexión (g6): lo capturado en este teléfono con sus tres estados. Pendiente: guardado, falta
 * enviarlo. Sincronizado: ya llegó. Rechazado: el servidor no lo aceptó (queda hasta que se quita).
 */
export function ColaPendiente() {
  const e = useSyncExternalStore(suscribir, instantanea, instantaneaServidor);
  const [resumen, setResumen] = useState<ResumenCola | null>(null);
  const cargar = useCallback(
    () =>
      cola()
        .then((c) => c.leerResumen())
        .then(setResumen),
    [],
  );
  useEffect(() => {
    void cargar();
  }, [cargar, e.pendientes, e.rechazados, e.sincronizados]);

  const sincronizados = resumen?.sincronizados.filter((h) => !TIPOS_SILENCIOSOS.has(h.tipo)) ?? [];
  const vacio =
    resumen && resumen.pendientes.length + sincronizados.length + resumen.rechazados.length === 0;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-safe pb-safe py-6">
      <header>
        <LinkNext href="/terreno" className="text-sm text-fg-muted underline">
          Volver al inicio
        </LinkNext>
        <h1 className="t-title mt-1 text-fg">Cola sin conexión</h1>
        <p className="text-base text-fg-muted">
          {e.pendientes === 1 ? "1 hecho por enviar" : `${e.pendientes} hechos por enviar`}
        </p>
      </header>
      <BannerConexion conVerCola={false} />
      {resumen && resumen.rechazados.length > 0 ? (
        <SeccionCola titulo="No se enviaron" cuenta={resumen.rechazados.length}>
          <ListaRechazados
            hechos={resumen.rechazados}
            onDescartar={(clave) => {
              void cola()
                .then((c) => c.descartarRechazado(clave))
                .then(cargar)
                .then(refrescarEstado);
            }}
          />
        </SeccionCola>
      ) : null}
      {resumen && resumen.pendientes.length > 0 ? (
        <SeccionCola titulo="Por enviar" cuenta={resumen.pendientes.length}>
          <ListaPendientes hechos={resumen.pendientes} />
        </SeccionCola>
      ) : null}
      {sincronizados.length > 0 ? (
        <SeccionCola titulo="Ya enviados" cuenta={sincronizados.length}>
          <ListaSincronizados hechos={sincronizados} />
        </SeccionCola>
      ) : null}
      {vacio ? (
        <Empty
          titulo="Nada capturado"
          descripcion="Cuando captures algo, aparecerá aquí con su estado."
        />
      ) : null}
      <p className="text-sm text-fg-muted">
        La hora es la de tu teléfono al momento de capturar. Si cierras la app, lo pendiente queda
        guardado y se envía cuando vuelva la señal.
      </p>
      <Button
        onClick={() => {
          void cola()
            .then((c) => c.pedirEnvio())
            .then(refrescarEstado);
        }}
        disabled={e.pendientes === 0 || !e.enLinea}
      >
        Reintentar ahora
      </Button>
    </main>
  );
}
