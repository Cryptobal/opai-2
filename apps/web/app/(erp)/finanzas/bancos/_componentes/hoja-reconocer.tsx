"use client";

import { useEffect, useState } from "react";

import { avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "../../flujo/_componentes/datos";
import { DialogDeshacerBanco } from "./dialog-deshacer-banco";
import type { MovimientoBanco } from "./bancos-tipos";
import { CuerpoHojaReconocer } from "./cuerpo-hoja-reconocer";
import type { SugerenciaReconocer } from "./lista-sugerencias-reconocer";

export function HojaReconocer({
  movimiento,
  abierta,
  onCerrar,
}: {
  movimiento: MovimientoBanco | null;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [sugerencias, setSugerencias] = useState<SugerenciaReconocer[]>([]);
  const [docManual, setDocManual] = useState("");
  const [deshacerAbierto, setDeshacerAbierto] = useState(false);
  const [motivoDeshacer, setMotivoDeshacer] = useState("");

  const movimientoId = movimiento?.id;
  const movimientoEstado = movimiento?.estado;

  useEffect(() => {
    if (!abierta || !movimientoId || movimientoEstado === "conciliado") return;
    limpiarError();
    let cancel = false;
    void ejecutar<{ sugerencias: SugerenciaReconocer[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId,
    }).then((r) => {
      if (!cancel) setSugerencias(r?.sugerencias ?? []);
    });
    return () => {
      cancel = true;
    };
  }, [abierta, movimientoId, movimientoEstado, ejecutar, limpiarError]);

  if (!movimiento) return null;

  const montoAbs = Math.abs(movimiento.monto);
  const esConciliado = movimiento.estado === "conciliado";

  async function confirmarEnlace(enlace: {
    tipo: "documento_emitido" | "documento_recibido" | "flujo_fila";
    id: string;
    monto: number;
  }) {
    limpiarError();
    const prev = await ejecutar(
      "finanzas.conciliaciones.confirmar",
      { movimientoId: movimiento!.id, enlaces: [enlace] },
      true,
    );
    if (!prev) return;
    const r = await ejecutar("finanzas.conciliaciones.confirmar", {
      movimientoId: movimiento!.id,
      enlaces: [enlace],
    });
    if (r) {
      avisar.exito("Movimiento conciliado");
      onCerrar();
    }
  }

  async function confirmarManual() {
    const id = docManual.trim();
    if (!id) return;
    await confirmarEnlace({ tipo: "documento_emitido", id, monto: montoAbs });
  }

  async function deshacer() {
    const r = await ejecutar("finanzas.conciliaciones.deshacer", {
      movimientoId: movimiento!.id,
      motivo: motivoDeshacer.trim(),
    });
    if (r) {
      avisar.exito("Conciliación deshecha");
      setDeshacerAbierto(false);
      onCerrar();
    }
  }

  return (
    <>
      <Sheet
        abierto={abierta}
        onCerrar={onCerrar}
        titulo={esConciliado ? "Conciliación" : "Reconocer movimiento"}
        descripcion={`${movimiento.glosa} · ${clp(movimiento.monto)}`}
        acciones={
          esConciliado ? (
            <>
              <Button variant="secondary" onClick={onCerrar}>
                Cerrar
              </Button>
              <Button variant="destructive" onClick={() => setDeshacerAbierto(true)}>
                Deshacer…
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onCerrar}>
                Sin conciliar
              </Button>
              <Button disabled={pendiente || docManual.trim().length < 36} onClick={() => void confirmarManual()}>
                Confirmar documento
              </Button>
            </>
          )
        }
      >
        <CuerpoHojaReconocer
          movimiento={movimiento}
          esConciliado={esConciliado}
          error={error}
          sugerencias={sugerencias}
          pendiente={pendiente}
          docManual={docManual}
          onDocManual={setDocManual}
          onElegirSugerencia={(s) =>
            void confirmarEnlace({ tipo: s.tipo, id: s.documentoId, monto: montoAbs })
          }
        />
      </Sheet>
      <DialogDeshacerBanco
        abierto={deshacerAbierto}
        pendiente={pendiente}
        motivo={motivoDeshacer}
        onMotivo={setMotivoDeshacer}
        onCerrar={() => setDeshacerAbierto(false)}
        onConfirmar={() => void deshacer()}
      />
    </>
  );
}
