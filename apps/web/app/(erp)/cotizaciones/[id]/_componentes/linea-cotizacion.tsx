"use client";

import { Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";
import { avisoLineaPuesto } from "@/lib/cpq-presentacion";

type CostoLinea = {
  estado: string;
  mensaje?: string;
  costoEmpresaMensualClp?: number;
  huellaJuego?: string;
};

export function LineaCotizacion({
  linea,
  editable,
  pendiente,
  verCostos,
  onEditar,
  onQuitar,
  onTraza,
}: {
  linea: {
    id: string;
    nombre: string;
    tipo: string;
    costo?: unknown;
    posiciones?: number;
    sueldoBaseClp?: number;
  };
  editable: boolean;
  pendiente: boolean;
  verCostos: boolean;
  onEditar: (linea: { id: string; nombre: string; posiciones?: number; sueldoBaseClp?: number }) => void;
  onQuitar: (id: string) => void;
  onTraza: (id: string) => void;
}) {
  const costo = linea.costo as CostoLinea | undefined;
  const aviso = avisoLineaPuesto(costo?.mensaje, linea.nombre);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="t-label">{linea.nombre}</p>
          <p className="t-caption text-fg-muted">
            {linea.tipo}
            {linea.posiciones ? ` · ${linea.posiciones} posición${linea.posiciones === 1 ? "" : "es"}` : null}
          </p>
          {verCostos && costo?.estado === "ok" && costo.costoEmpresaMensualClp != null ? (
            <p className="t-body-sm t-numeric">
              Costo empresa: {pesos(costo.costoEmpresaMensualClp)}/mes
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {verCostos && costo?.estado === "ok" ? (
            <Button type="button" variant="ghost" size="iconSm" disabled={pendiente} onClick={() => onTraza(linea.id)}>
              Ver traza
            </Button>
          ) : null}
          {editable ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                disabled={pendiente}
                onClick={() => {
                  const payload: {
                    id: string;
                    nombre: string;
                    posiciones?: number;
                    sueldoBaseClp?: number;
                  } = { id: linea.id, nombre: linea.nombre };
                  if (linea.posiciones !== undefined) payload.posiciones = linea.posiciones;
                  if (linea.sueldoBaseClp !== undefined) payload.sueldoBaseClp = linea.sueldoBaseClp;
                  onEditar(payload);
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                disabled={pendiente}
                onClick={() => onQuitar(linea.id)}
              >
                Quitar
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {costo?.estado === "pendiente" && aviso ? (
        <div
          role="status"
          className="rounded-md border border-warning-muted bg-warning-muted/40 px-3 py-2 text-sm text-warning-fg"
        >
          <p className="font-semibold">{aviso.titulo}</p>
          {aviso.detalle ? <p className="mt-0.5 text-warning-fg/90">{aviso.detalle}</p> : null}
          {aviso.enlace ? (
            <LinkNext href={aviso.enlace.href} className="mt-1 inline-block font-semibold underline">
              {aviso.enlace.etiqueta}
            </LinkNext>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
