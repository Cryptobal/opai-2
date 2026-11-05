"use client";

import { useEffect, useState } from "react";

import { Empty } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { kmTexto, pesos } from "../formato";
import type { PortalRendicion } from "../tipos";
import type { Lugar } from "./lugar";

export type CalculoKm = {
  km: number;
  kmEfectivos: number;
  origenDistancia: "google" | "linea_recta";
  metodo: string;
  montoClp: number;
  desglose: { concepto: string; montoClp: number; detalle: string }[];
  advertencias: string[];
};
export type EntradaKm = {
  origen: Lugar | null;
  destino: Lugar | null;
  idaYVuelta: boolean;
  peajeClp: number;
  tramo: string;
  fecha: string;
};

/** Pide a la capacidad el cálculo del viaje cada vez que cambian sus datos. El monto nunca se escribe a mano. */
export function useCalculoKm(e: EntradaKm, portal: PortalRendicion, requiereTramo: boolean) {
  const [res, setRes] = useState<{
    clave: string;
    calculo: CalculoKm | null;
    error: string | null;
  } | null>(null);
  const { origen, destino, idaYVuelta, peajeClp, tramo, fecha } = e;
  const listo = !!origen && !!destino && !!fecha && !(requiereTramo && !tramo);
  const clave = JSON.stringify([origen, destino, idaYVuelta, peajeClp, tramo, fecha, portal]);
  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await ejecutarCapacidad(portal, "rendiciones.kilometraje.calcular", {
        origen,
        destino,
        idaYVuelta,
        peajeClp,
        fecha,
        ...(tramo ? { tramo } : {}),
      });
      if (vigente)
        setRes({
          clave,
          calculo: r.ok ? (r.data as CalculoKm) : null,
          error: r.ok ? null : r.error.message,
        });
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [clave, listo, origen, destino, idaYVuelta, peajeClp, tramo, fecha, portal]);
  // El resultado solo vale para los datos con que se pidió; si cambian, se muestra «Calculando…».
  const vigente = listo && res?.clave === clave ? res : null;
  return {
    calculo: vigente?.calculo ?? null,
    error: vigente?.error ?? null,
    calculando: listo && !vigente,
  };
}

/** Desglose línea por línea y total, tal como lo devolvió el servidor. */
export function DesgloseKm({
  calculo,
  calculando,
}: {
  calculo: CalculoKm | null;
  calculando: boolean;
}) {
  if (!calculo)
    return (
      <p className="t-caption" role="status">
        {calculando ? "Calculando…" : "Elige el origen y el destino para calcular el monto."}
      </p>
    );
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
      aria-live="polite"
    >
      <p className="text-base text-fg-muted">
        {kmTexto(calculo.kmEfectivos)} km
        {calculo.origenDistancia === "linea_recta" ? " en línea recta" : " por ruta"}
      </p>
      <ul className="flex flex-col gap-1">
        {calculo.desglose.map((l) => (
          <li key={l.concepto} className="flex items-baseline justify-between gap-3 text-base">
            <span className="min-w-0 text-fg">
              {l.concepto} <span className="text-fg-muted">· {l.detalle}</span>
            </span>
            <span className="tabular-nums text-fg">{pesos(l.montoClp)}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between border-t border-border pt-2 text-fg">
        <span className="t-label">Total a rendir</span>
        <span className="t-title tabular-nums">{pesos(calculo.montoClp)}</span>
      </p>
      <p className="t-caption">El monto lo calcula el sistema; no se puede escribir a mano.</p>
      {calculo.advertencias.map((a) => (
        <p key={a} className="text-sm text-warning-fg">
          {a}
        </p>
      ))}
    </div>
  );
}

/** La empresa aún no eligió cómo se calcula el kilometraje: quien rinde avisa a un administrador. */
export function SinKilometraje() {
  return (
    <Empty
      titulo="Tu empresa aún no configura el kilometraje"
      descripcion="Avisa a un administrador de tu empresa: debe elegir cómo se calcula el kilometraje en Configuración."
    />
  );
}
