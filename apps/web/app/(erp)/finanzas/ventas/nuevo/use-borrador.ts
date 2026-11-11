"use client";

import { avisar } from "@opai/ds";

import type { useCapacidad } from "@/app/_components/use-capacidad";

import type { Venta } from "../_componentes/tipos";
import { construirInputBorrador, type LineaForm, type RefForm } from "./emitir-util";

type Ejecutar = ReturnType<typeof useCapacidad>["ejecutar"];

/** Vista previa (dryRun) y guardado del borrador de una factura 33/34. */
export function useBorrador(p: {
  ejecutar: Ejecutar;
  formOk: boolean;
  datos: {
    cuentaId: string | null;
    tipoDte: "33" | "34";
    plazo: number;
    fechaEmision: string;
    lineas: LineaForm[];
    glosa: string;
    referencias: RefForm[];
  };
  setPreviewBorrador: (v: Venta | null) => void;
  setDocumentoId: (id: string) => void;
  setDialogo: (d: "borrador" | "emitir" | null) => void;
}) {
  const { ejecutar, formOk, datos, setPreviewBorrador, setDocumentoId, setDialogo } = p;
  const input = (dryRun: boolean) =>
    construirInputBorrador({ ...datos, cuentaId: datos.cuentaId ?? "", dryRun });

  async function revisarBorrador() {
    if (!formOk) return;
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador", input(true), true);
    if (r) {
      setPreviewBorrador(r);
      setDialogo("borrador");
    }
  }

  async function guardarBorrador() {
    if (!formOk) return;
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador", input(false), false);
    if (!r) return;
    setDocumentoId(r.id);
    setPreviewBorrador(null);
    setDialogo(null);
    avisar.exito("Borrador guardado");
  }

  return { revisarBorrador, guardarBorrador };
}
