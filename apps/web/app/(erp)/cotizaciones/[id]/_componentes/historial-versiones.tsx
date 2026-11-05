"use client";

import { estadoCpqBadge } from "@/lib/cpq-presentacion";
import { pesos } from "@/lib/fechas";

export function HistorialVersionesCpq({
  versiones,
}: {
  versiones: {
    numero: number;
    estado: string;
    enviadaEn: string | Date | null;
    ventaMensualClp?: number | null;
  }[];
  codigo: string;
}) {
  if (versiones.length === 0) return null;
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <h3 className="t-label">Historial de versiones</h3>
      <ol className="space-y-4">
        {versiones.map((v) => {
          const e = estadoCpqBadge(v.estado);
          return (
            <li key={v.numero} className="flex gap-3">
              <span className="t-mono flex size-8 flex-none items-center justify-center rounded-full border border-border text-xs font-semibold">
                v{v.numero}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="t-label">
                  {e.etiqueta}
                  {v.ventaMensualClp != null ? (
                    <span className="t-caption font-normal text-fg-muted">
                      {" "}
                      · {pesos(v.ventaMensualClp)} mensual
                    </span>
                  ) : null}
                </p>
                {v.enviadaEn ? (
                  <p className="t-caption text-fg-muted">
                    Enviada{" "}
                    {String(v.enviadaEn).slice(0, 10).split("-").reverse().join("-")}
                  </p>
                ) : (
                  <p className="t-caption text-fg-muted">Sin envío registrado</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
