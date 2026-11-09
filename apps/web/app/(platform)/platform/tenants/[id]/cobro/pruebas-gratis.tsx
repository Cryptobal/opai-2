"use client";

import { FlaskConical } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { formatearFecha } from "@opai/domain";
import { Badge, Button } from "@opai/ds";

import type { PruebaGratisVista } from "./tipos-prueba";

// La hoja se descarga al abrirla: no pesa en la ruta (ADR-037).
const HojaExtender = dynamic(() => import("./hoja-extender").then((m) => m.HojaExtender));

/** Pruebas gratis que la empresa activó desde su ERP: Plataforma las extiende o reactiva (CAR-222). */
export function PruebasGratis(props: { tenantId: string; pruebas: PruebaGratisVista[] }) {
  const { tenantId, pruebas } = props;
  const [extendiendo, setExtendiendo] = useState<PruebaGratisVista | null>(null);
  if (pruebas.length === 0)
    return (
      <p className="t-caption rounded-lg border border-border bg-surface px-4 py-3">
        La empresa aún no ha activado ninguna prueba gratis. La activa ella desde su ERP, una vez
        por módulo.
      </p>
    );
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface">
        {pruebas.map((p) => (
          <li
            key={p.moduloId}
            className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-medium text-fg">{p.nombre}</span>
                <Badge tono={p.estado === "vigente" ? "info" : "neutro"}>
                  {p.estado === "vigente"
                    ? `Vigente · ${p.diasRestantes === 1 ? "último día" : `${p.diasRestantes} días`}`
                    : "Terminada"}
                </Badge>
              </span>
              <span className="t-caption">
                {formatearFecha(p.inicio)} al {formatearFecha(p.hasta)}
                {p.extensiones
                  ? ` · extendida ${p.extensiones} ${p.extensiones === 1 ? "vez" : "veces"}`
                  : ""}
              </span>
            </span>
            <Button variant="secondary" onClick={() => setExtendiendo(p)} className="md:w-auto">
              <FlaskConical className="size-4" aria-hidden />
              {p.estado === "vigente" ? "Extender 10 días" : "Reactivar 10 días"}
            </Button>
          </li>
        ))}
      </ul>
      {extendiendo ? (
        <HojaExtender
          key={extendiendo.moduloId}
          tenantId={tenantId}
          prueba={extendiendo}
          onCerrar={() => setExtendiendo(null)}
        />
      ) : null}
    </>
  );
}
