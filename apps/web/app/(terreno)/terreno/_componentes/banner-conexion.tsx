"use client";

import { useSyncExternalStore } from "react";

import { Alerta } from "@opai/ds";

import { instantanea, instantaneaServidor, suscribir } from "@/lib/terreno/estado";
import { LinkNext } from "@/app/_components/link-next";

const hechos = (n: number) => `${n} ${n === 1 ? "hecho" : "hechos"}`;

/** Estado de la conexión y de la cola (g0/g6): en línea, sin conexión, sincronizando o con un envío fallido. */
export function BannerConexion({ conVerCola = true }: { conVerCola?: boolean }) {
  const e = useSyncExternalStore(suscribir, instantanea, instantaneaServidor);
  const ver =
    conVerCola && e.pendientes > 0 ? (
      <LinkNext href="/terreno/cola" className="font-medium underline">
        Ver cola
      </LinkNext>
    ) : undefined;
  if (!e.enLinea) {
    return (
      <Alerta
        tono="warning"
        titulo={
          e.pendientes > 0 ? `Sin conexión · ${hechos(e.pendientes)} por enviar` : "Sin conexión"
        }
        accion={ver}
      >
        Lo que captures queda guardado en este teléfono y se envía al volver la señal.
      </Alerta>
    );
  }
  if (e.error && e.pendientes > 0) {
    return (
      <Alerta tono="danger" titulo={`No pudimos enviar ${hechos(e.pendientes)}`} accion={ver}>
        Siguen guardados en este teléfono. Reintentaremos solos.
      </Alerta>
    );
  }
  if (e.pendientes > 0) {
    return <Alerta tono="info" titulo={`Enviando ${hechos(e.pendientes)}…`} accion={ver} />;
  }
  return <Alerta tono="success" titulo="En línea · todo enviado" />;
}
