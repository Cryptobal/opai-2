"use client";

import { Button, SeccionTarjeta } from "@opai/ds";

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
    <SeccionTarjeta titulo="Historial de versiones">
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
                    <span className="t-caption text-fg-muted font-normal">
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
      <p className="t-caption text-fg-muted mt-4">
        Reimprimir el PDF exacto enviado llegará con el rediseño del documento (PR siguiente).
      </p>
    </SeccionTarjeta>
  );
}

export function PanelDocumentoPdf({
  codigo,
  version,
  estado,
  onVistaPrevia,
}: {
  codigo: string;
  version: number;
  estado: string;
  onVistaPrevia: () => void;
}) {
  const borrador = estado === "borrador" || estado === "en_aprobacion" || estado === "lista";
  return (
    <SeccionTarjeta
      titulo="Documento PDF"
      accion={
        <Button type="button" variant="secondary" size="md" onClick={onVistaPrevia}>
          Vista previa
        </Button>
      }
    >
      <p className="t-body-sm text-fg-muted">
        Plantilla del tenant (Clásica / Moderna / Compacta en Configuración › Marca y plantillas).
      </p>
      <p className="t-caption text-fg-muted mt-2">
        {codigo} v{version} · {borrador ? "Vista previa con marca BORRADOR" : "Documento enviado sin borrador"}
      </p>
    </SeccionTarjeta>
  );
}
