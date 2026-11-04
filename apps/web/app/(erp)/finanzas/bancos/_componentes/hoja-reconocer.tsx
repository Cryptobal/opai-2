"use client";

import { useEffect, useState } from "react";

import { diferenciaAsignada } from "@opai/domain";
import { avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "../../flujo/_componentes/datos";
import { DialogDeshacerBanco } from "./dialog-deshacer-banco";
import type { MovimientoBanco } from "./bancos-tipos";
import { CuerpoHojaReconocer } from "./cuerpo-hoja-reconocer";
import type { SugerenciaReconocer } from "./lista-sugerencias-reconocer";
import type { Elegida } from "./seleccion-conciliacion";

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
  const [elegidas, setElegidas] = useState<Elegida[]>([]);
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
      if (cancel) return;
      setElegidas([]);
      setSugerencias(r?.sugerencias ?? []);
    });
    return () => {
      cancel = true;
    };
  }, [abierta, movimientoId, movimientoEstado, ejecutar, limpiarError]);

  if (!movimiento) return null;

  const montoAbs = Math.abs(movimiento.monto);
  const esConciliado = movimiento.estado === "conciliado";

  async function confirmar() {
    limpiarError();
    const enlaces = elegidas.filter((e) => e.monto > 0).map((e) => ({ tipo: e.tipo, id: e.id, monto: e.monto }));
    const input = { movimientoId: movimiento!.id, enlaces };
    if (!(await ejecutar("finanzas.conciliaciones.confirmar", input, true))) return;
    const r = await ejecutar("finanzas.conciliaciones.confirmar", input);
    if (r) {
      avisar.exito(enlaces.length > 1 ? `Movimiento conciliado con ${enlaces.length} documentos` : "Movimiento conciliado");
      onCerrar();
    }
  }
  const cuadra = elegidas.some((e) => e.monto > 0) && diferenciaAsignada(montoAbs, elegidas) === 0;

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
              <Button disabled={pendiente || !cuadra} onClick={() => void confirmar()}>
                Confirmar conciliación
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
          elegidas={elegidas}
          onElegidas={setElegidas}
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
