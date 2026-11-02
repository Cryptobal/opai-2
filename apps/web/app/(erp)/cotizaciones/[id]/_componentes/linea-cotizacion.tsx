"use client";

import { Button } from "@opai/ds";

import { pesos } from "@/lib/fechas";

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
  onRenombrar,
  onQuitar,
  onTraza,
}: {
  linea: { id: string; nombre: string; tipo: string; costo?: unknown };
  editable: boolean;
  pendiente: boolean;
  onRenombrar: (id: string, nombre: string) => void;
  onQuitar: (id: string) => void;
  onTraza: (id: string) => void;
}) {
  const costo = linea.costo as CostoLinea | undefined;
  return (
    <li className="space-y-1 t-body-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {linea.nombre} · {linea.tipo}
        </span>
        {costo?.estado === "ok" && costo.costoEmpresaMensualClp != null ? (
          <span className="t-caption">Costo empresa: {pesos(costo.costoEmpresaMensualClp)}/mes</span>
        ) : null}
        {costo?.estado === "pendiente" ? (
          <span className="t-caption text-warning">{costo.mensaje}</span>
        ) : null}
        {costo?.estado === "ok" ? (
          <Button type="button" variant="ghost" disabled={pendiente} onClick={() => onTraza(linea.id)}>
            Ver traza
          </Button>
        ) : null}
        {editable ? (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={pendiente}
              onClick={() => {
                const n = window.prompt("Nombre de la línea", linea.nombre);
                if (n) onRenombrar(linea.id, n);
              }}
            >
              Editar
            </Button>
            <Button type="button" variant="ghost" disabled={pendiente} onClick={() => onQuitar(linea.id)}>
              Quitar
            </Button>
          </>
        ) : null}
      </div>
      {costo?.huellaJuego ? <p className="t-caption text-fg-muted">Huella: {costo.huellaJuego}</p> : null}
    </li>
  );
}
