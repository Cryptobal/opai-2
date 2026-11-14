"use client";

import { useEffect, useState } from "react";

import { diferenciaAsignada } from "@opai/domain";
import { avisar, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "../../flujo/_componentes/datos";
import { DialogDeshacerBanco } from "./dialog-deshacer-banco";
import type { MovimientoBanco } from "./bancos-tipos";
import { confirmarContraFila } from "./confirmar-fila";
import { CuerpoHojaReconocer } from "./cuerpo-hoja-reconocer";
import type { SugerenciaRegla } from "./destinos";
import { useReconocerFila } from "./use-reconocer-fila";
import type { SugerenciaReconocer } from "./lista-sugerencias-reconocer";
import type { Elegida } from "./seleccion-conciliacion";

/** Panel derecho de Bancos (CAR-257): reconocer o revisar la conciliación del movimiento elegido, junto a la lista. */
export function PanelReconocer({ movimiento, onCerrar }: { movimiento: MovimientoBanco | null; onCerrar: () => void }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [sugerencias, setSugerencias] = useState<SugerenciaReconocer[]>([]);
  const [elegidas, setElegidas] = useState<Elegida[]>([]);
  const [deshacerAbierto, setDeshacerAbierto] = useState(false);
  const [motivoDeshacer, setMotivoDeshacer] = useState("");
  const fila = useReconocerFila(ejecutar, true, movimiento?.glosa ?? "");
  const { alSugerir, modo } = fila;

  const movimientoId = movimiento?.id;
  const movimientoEstado = movimiento?.estado;

  useEffect(() => {
    if (!movimientoId || movimientoEstado === "conciliado") return;
    limpiarError();
    let cancel = false;
    void ejecutar<{ sugerencias: SugerenciaReconocer[]; reglas?: SugerenciaRegla[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId,
    }).then((r) => {
      if (cancel) return;
      setElegidas([]);
      setSugerencias(r?.sugerencias ?? []);
      alSugerir(r?.reglas ?? [], !!r?.sugerencias.length);
    });
    return () => {
      cancel = true;
    };
  }, [movimientoId, movimientoEstado, ejecutar, limpiarError, alSugerir]);

  if (!movimiento) return null;

  const montoAbs = Math.abs(movimiento.monto);
  const esConciliado = movimiento.estado === "conciliado";

  async function confirmar() {
    limpiarError();
    if (modo === "fila") {
      const texto = await confirmarContraFila(ejecutar, movimiento!, fila.eleccion);
      if (texto) {
        avisar.exito(texto);
        onCerrar();
      }
      return;
    }
    const enlaces = elegidas.filter((e) => e.monto > 0).map((e) => ({ tipo: e.tipo, id: e.id, monto: e.monto }));
    const input = { movimientoId: movimiento!.id, enlaces };
    if (!(await ejecutar("finanzas.conciliaciones.confirmar", input, true))) return;
    const r = await ejecutar("finanzas.conciliaciones.confirmar", input);
    if (r) {
      avisar.exito(enlaces.length > 1 ? `Movimiento conciliado con ${enlaces.length} documentos` : "Movimiento conciliado");
      onCerrar();
    }
  }
  const cuadra =
    modo === "fila"
      ? fila.listo
      : elegidas.some((e) => e.monto > 0) && diferenciaAsignada(montoAbs, elegidas) === 0;

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
      <Card className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="t-subheading text-fg">{esConciliado ? "Conciliación" : "Reconocer movimiento"}</h2>
          <p className="t-body-sm text-fg-muted break-words">{`${movimiento.glosa} · ${clp(movimiento.monto)}`}</p>
        </div>
        <CuerpoHojaReconocer
          movimiento={movimiento}
          esConciliado={esConciliado}
          error={error}
          sugerencias={sugerencias}
          pendiente={pendiente}
          elegidas={elegidas}
          onElegidas={setElegidas}
          fila={fila}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {esConciliado ? (
            <Button variant="destructive" onClick={() => setDeshacerAbierto(true)}>
              Deshacer…
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onCerrar}>
                Sin conciliar
              </Button>
              <Button disabled={pendiente || !cuadra} onClick={() => void confirmar()}>
                Confirmar conciliación
              </Button>
            </>
          )}
        </div>
      </Card>
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
