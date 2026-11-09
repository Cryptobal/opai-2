"use client";

import { MoreHorizontal } from "lucide-react";

import { Button, type ItemMenu, Menu } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";
import { avisoLineaPuesto } from "@/lib/cpq-avisos";
import { textoDias, textoHorario } from "@/lib/cpq-puesto-detalle";
import { subtituloLineaCpq } from "@/lib/cpq-presentacion";

import type { LineaEditable } from "../../_componentes/puesto-tipos";

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
  linea: LineaEditable & {
    tipo: string;
    costo?: unknown;
    diasCobertura?: number | null;
    cantidadEscalada?: number | null;
  };
  editable: boolean;
  pendiente: boolean;
  verCostos: boolean;
  onEditar: (linea: LineaEditable) => void;
  onQuitar: (id: string) => void;
  onTraza: (id: string) => void;
}) {
  const costo = linea.costo as CostoLinea | undefined;
  const aviso = avisoLineaPuesto(costo?.mensaje, linea);
  const subtitulo = subtituloLineaCpq(linea);
  // Sin ciclo, el subtítulo ya muestra el horario: no se repite.
  const horario = linea.tipo === "puesto" && linea.patron?.trim() ? textoHorario(linea.horaInicio, linea.horaFin) : null;
  const dias = linea.tipo === "puesto" ? textoDias(linea.diasSemana) : null;
  // El sueldo solo existe en los datos con `cpq:costos.ver`: sin él no se dibuja ni vacío (R59).
  const sueldo = linea.tipo === "puesto" && verCostos ? linea.sueldoBaseClp : undefined;

  function payloadEditar() {
    onEditar(linea);
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
          {horario || dias ? (
            <p className="t-caption text-fg-muted tabular-nums">{[horario, dias].filter(Boolean).join(" · ")}</p>
          ) : null}
          {sueldo != null ? (
            <p className="t-body-sm t-numeric text-fg-muted">Sueldo bruto: {pesos(sueldo)}/mes</p>
          ) : null}
          {verCostos && costo?.estado === "ok" && costo.costoEmpresaMensualClp != null ? (
            <p className="t-body-sm t-numeric text-fg-muted">
              Costo empresa: {pesos(costo.costoEmpresaMensualClp)}/mes
            </p>
          ) : null}
        </div>
        {itemsMenu.length > 0 ? (
          <Menu
            etiqueta={`Acciones de ${linea.nombre}`}
            items={itemsMenu}
            disparador={<MoreHorizontal className="size-5" aria-hidden />}
            claseDisparador="border border-border-strong bg-surface size-11 shrink-0"
          />
        ) : null}
      </div>
      {costo?.estado === "pendiente" && aviso ? (
        <div
          role="status"
          className="rounded-md border border-warning-muted bg-warning-muted/40 px-3 py-2.5 text-sm text-warning-fg"
        >
          <p className="font-semibold leading-snug">{aviso.titulo}</p>
          {aviso.detalle ? <p className="mt-1 text-warning-fg/90">{aviso.detalle}</p> : null}
          {aviso.accion && editable ? (
            <Button type="button" variant="secondary" size="md" className="mt-2" disabled={pendiente} onClick={payloadEditar}>
              {aviso.accion.etiqueta}
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
