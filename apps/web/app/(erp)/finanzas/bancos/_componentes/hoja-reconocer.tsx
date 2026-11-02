"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Input, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "../../flujo/_componentes/datos";
import type { MovimientoBanco } from "./datos";

type Sugerencia = {
  documentoId: string;
  tipo: "documento_emitido" | "documento_recibido";
  nivel: string;
  confianza: number;
  motivo: string;
  montoDocumento: number;
  montoPendiente: number;
  diferencia: number;
};

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
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [docManual, setDocManual] = useState("");
  const [deshacerAbierto, setDeshacerAbierto] = useState(false);
  const [motivoDeshacer, setMotivoDeshacer] = useState("");

  useEffect(() => {
    if (!abierta || !movimiento || movimiento.estado === "conciliado") {
      setSugerencias([]);
      return;
    }
    limpiarError();
    void ejecutar<{ sugerencias: Sugerencia[] }>("finanzas.conciliaciones.sugerir", {
      movimientoId: movimiento.id,
    }).then((r) => setSugerencias(r?.sugerencias ?? []));
  }, [abierta, movimiento?.id, movimiento?.estado]);

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
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <p className="t-caption text-muted">
            {movimiento.fecha}
            {movimiento.referencia ? ` · Ref. ${movimiento.referencia}` : ""}
          </p>
          {esConciliado ? (
            <Alerta tono="success" titulo="Movimiento conciliado">
              Puedes deshacer la conciliación; el cobro en ventas se revierte.
            </Alerta>
          ) : (
            <>
              <Alerta tono="info" titulo="Es una sugerencia">
                No marca la factura como pagada hasta que confirmes.
              </Alerta>
              {sugerencias.length === 0 ? (
                <p className="t-body-sm text-muted">Sin sugerencias automáticas para este movimiento.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sugerencias.map((s) => (
                    <li key={s.documentoId} className="rowcard flex flex-wrap items-center gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="t-body-sm font-medium">Documento {s.documentoId.slice(0, 8)}…</p>
                        <p className="t-caption text-muted">{s.motivo}</p>
                      </div>
                      <Badge tono="neutro">{s.nivel}</Badge>
                      <Button
                        variant="secondary"
                        disabled={pendiente}
                        onClick={() =>
                          void confirmarEnlace({ tipo: s.tipo, id: s.documentoId, monto: montoAbs })
                        }
                      >
                        Elegir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Campo etiqueta="Otro documento (UUID)" htmlFor="banco-doc-manual">
                <Input
                  id="banco-doc-manual"
                  value={docManual}
                  onChange={(e) => setDocManual(e.target.value)}
                  placeholder="ID del DTE emitido"
                />
              </Campo>
            </>
          )}
        </div>
      </Sheet>
      <Dialog
        abierto={deshacerAbierto}
        onCerrar={() => setDeshacerAbierto(false)}
        titulo="Deshacer conciliación"
        descripcion="El movimiento volverá a pendiente y se revertirá el cobro en ventas."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDeshacerAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente || motivoDeshacer.trim().length < 3}
              onClick={() => void deshacer()}
            >
              Deshacer
            </Button>
          </>
        }
      >
        <Campo etiqueta="Motivo" htmlFor="banco-deshacer-motivo">
          <Textarea
            id="banco-deshacer-motivo"
            rows={3}
            value={motivoDeshacer}
            onChange={(e) => setMotivoDeshacer(e.target.value)}
          />
        </Campo>
      </Dialog>
    </>
  );
}
