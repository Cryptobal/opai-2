"use client";

import { useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DescartarBorrador } from "./descartar-borrador";
import { HojaEditarBorrador } from "./hoja-editar-borrador";
import type { DatosBorrador, Venta } from "./tipos";
import { BloqueEmisionGuardada, EmitirDialogos } from "../nuevo/emitir-secciones";
import { useEmision } from "../nuevo/use-emision";

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
      <BloqueEmisionGuardada
        pendiente={pendiente}
        etiquetaEmitir={tipoDte === 56 ? "Emitir nota de débito" : "Emitir factura"}
        revisarEmision={() => void emision.revisarEmision()}
        emitir={() => void emision.emitir()}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditando(true)}>Editar</Button>
        <DescartarBorrador documentoId={documentoId} etiqueta={tipoDte === 56 ? "esta nota de débito" : "este borrador"} destino="/finanzas/ventas" />
      </div>
      {editando ? <HojaEditarBorrador venta={venta} onCerrar={() => setEditando(false)} /> : null}
      <EmitirDialogos
        dialogo={dialogo}
        setDialogo={setDialogo}
        previewBorrador={null}
        previewEmitir={emision.previewEmitir}
        guardarBorrador={() => undefined}
        emitir={() => void emision.emitir()}
      />
    </div>
  );
}
