"use client";

import { useState } from "react";

import { Alerta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { EmitirPdfPrevio } from "../nuevo/emitir-pdf-previo";
import { EmitirDialogos } from "../nuevo/emitir-secciones";
import { useEmision } from "../nuevo/use-emision";

import { BloqueAccionesBorrador } from "./bloque-acciones-borrador";
import { HojaEditarBorrador } from "./hoja-editar-borrador";
import type { DatosBorrador, Venta } from "./tipos";

/**
 * Emitir un borrador desde su ficha (CAR-234): la nota de débito de cargo (y la factura) guardada como borrador se
 * revisa y emite con el mismo flujo de la pantalla Emitir, aunque la persona haya salido de ella.
 */
export function EmitirBorradorFicha({ venta, abrirEditar }: { venta: Venta & DatosBorrador & { fechaVencimiento?: string | null }; abrirEditar: boolean }) {
  const { id: documentoId, tipoDte } = venta;
  const [editando, setEditando] = useState(abrirEditar);
  const { ejecutar, pendiente, error, codigo } = useCapacidad("erp");
  const [dialogo, setDialogo] = useState<"borrador" | "emitir" | null>(null);
  const emision = useEmision({ ejecutar, codigo, documentoId, setDialogo });
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
      {emision.preflightBloqueante ? (
        <Alerta tono="warning" titulo="Falta algo para emitir">{emision.preflightBloqueante}</Alerta>
      ) : null}
      <BloqueAccionesBorrador
        documentoId={documentoId}
        etiquetaEmitir={tipoDte === 56 ? "Emitir nota de débito" : "Emitir factura"}
        etiquetaDescartar={tipoDte === 56 ? "esta nota de débito" : "este borrador"}
        pendiente={pendiente}
        revisarEmision={() => void emision.revisarEmision()}
        emitir={() => void emision.emitir()}
        editar={() => setEditando(true)}
      />
      {editando ? <HojaEditarBorrador venta={venta} onCerrar={() => setEditando(false)} /> : null}
      <EmitirPdfPrevio documentoId={documentoId} />
      <EmitirDialogos
        dialogo={dialogo}
        setDialogo={setDialogo}
        previewBorrador={null}
        previewEmitir={emision.previewEmitir}
        documentoId={documentoId}
        guardarBorrador={() => undefined}
        emitir={() => void emision.emitir()}
      />
    </div>
  );
}
