"use client";

import { MoreHorizontal } from "lucide-react";

import { Button, type ItemMenu, Menu } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";
import { avisoLineaPuesto, subtituloLineaCpq } from "@/lib/cpq-presentacion";

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
    patron?: string | null;
    horaInicio?: string | null;
    horaFin?: string | null;
    diasCobertura?: number | null;
    cantidadEscalada?: number | null;
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
  const subtitulo = subtituloLineaCpq(linea);

  function payloadEditar() {
    const payload: {
      id: string;
      nombre: string;
      posiciones?: number;
      sueldoBaseClp?: number;
    } = { id: linea.id, nombre: linea.nombre };
    if (linea.posiciones !== undefined) payload.posiciones = linea.posiciones;
    if (linea.sueldoBaseClp !== undefined) payload.sueldoBaseClp = linea.sueldoBaseClp;
    onEditar(payload);
  }

  const itemsMenu: ItemMenu[] = [];
  if (verCostos && costo?.estado === "ok") {
    itemsMenu.push({
      id: "traza",
      etiqueta: "Ver traza",
      onSelect: () => onTraza(linea.id),
    });
  }
  if (editable) {
    itemsMenu.push(
      { id: "editar", etiqueta: "Editar", onSelect: payloadEditar },
      { id: "quitar", etiqueta: "Quitar", onSelect: () => onQuitar(linea.id) },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="t-label text-fg">{linea.nombre}</p>
          {subtitulo ? <p className="t-caption text-fg-muted">{subtitulo}</p> : null}
          {verCostos && costo?.estado === "ok" && costo.costoEmpresaMensualClp != null ? (
            <p className="t-body-sm t-numeric text-fg-muted">
              Costo empresa: {pesos(costo.costoEmpresaMensualClp)}/mes
            </p>
          ) : null}
        </div>
        {itemsMenu.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {verCostos && costo?.estado === "ok" ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="hidden md:inline-flex"
                disabled={pendiente}
                onClick={() => onTraza(linea.id)}
              >
                Ver traza
              </Button>
            ) : null}
            {editable ? (
              <div className="hidden items-center gap-2 md:flex">
                <Button type="button" variant="ghost" size="md" disabled={pendiente} onClick={payloadEditar}>
                  Editar
                </Button>
                <Button type="button" variant="ghost" size="md" disabled={pendiente} onClick={() => onQuitar(linea.id)}>
                  Quitar
                </Button>
              </div>
            ) : null}
            <div className="md:hidden">
              <Menu
                etiqueta="Acciones de la línea"
                items={itemsMenu}
                disparador={<MoreHorizontal className="size-5" aria-hidden />}
                claseDisparador="border border-border-strong bg-surface size-11"
              />
            </div>
          </div>
        ) : null}
      </div>
      {costo?.estado === "pendiente" && aviso ? (
        <div
          role="status"
          className="rounded-md border border-warning-muted bg-warning-muted/40 px-3 py-2.5 text-sm text-warning-fg"
        >
          <p className="font-semibold leading-snug">{aviso.titulo}</p>
          {aviso.detalle ? <p className="mt-1 text-warning-fg/90">{aviso.detalle}</p> : null}
          {aviso.editarPuesto ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 min-h-11 font-semibold underline"
              disabled={pendiente}
              onClick={payloadEditar}
            >
              Editar puesto
            </Button>
          ) : aviso.enlace ? (
            <LinkNext href={aviso.enlace.href} className="mt-2 inline-flex min-h-11 items-center font-semibold underline">
              {aviso.enlace.etiqueta}
            </LinkNext>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
