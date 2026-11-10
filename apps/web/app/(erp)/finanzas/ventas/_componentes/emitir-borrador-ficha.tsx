"use client";

import { useState } from "react";

import { Alerta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { BloqueEmisionGuardada, EmitirDialogos } from "../nuevo/emitir-secciones";
import { useEmision } from "../nuevo/use-emision";

/**
 * Emitir un borrador desde su ficha (CAR-234): la nota de débito de cargo (y la factura) guardada como borrador se
 * revisa y emite con el mismo flujo de la pantalla Emitir, aunque la persona haya salido de ella.
 */
export function EmitirBorradorFicha({ documentoId, tipoDte }: { documentoId: string; tipoDte: number }) {
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
