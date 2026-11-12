"use client";

import { useMemo, useState } from "react";

import { Alerta, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { enviarAlSiiTrasEmitir } from "./enviar-sii-tras-emitir";
import { corrigeSoloTexto, montoDeNotaValido, montoParaNota } from "./monto-nota";
import { pesos } from "@/lib/fechas";

const CODIGOS = [
  { valor: "1", etiqueta: "Anula el documento" },
  { valor: "3", etiqueta: "Corrige montos" },
  { valor: "2", etiqueta: "Corrige texto" },
];

/** Nota de crédito total o parcial sobre el documento de la ficha. */
export function HojaNotaCredito({
  documentoId,
  total,
  abierta,
  onCerrar,
}: {
  documentoId: string;
  total: number;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [monto, setMonto] = useState(String(total));
  const [motivo, setMotivo] = useState("");
  const [codigo, setCodigo] = useState("1");
  const [intento] = useState(() => crypto.randomUUID());
  const soloTexto = corrigeSoloTexto(codigo);
  const valido = montoDeNotaValido(codigo, monto, total) && motivo.trim().length >= 3;
  const input = useMemo(
    () => ({
      documentoReferenciaId: documentoId,
      monto: montoParaNota(codigo, monto),
      motivo: motivo.trim(),
      codigoReferencia: Number(codigo),
    }),
    [documentoId, monto, motivo, codigo],
  );

  async function emitir() {
    limpiarError();
    const r = await ejecutar<{ id: string }>("finanzas.ventas.emitir_nota_credito", input, false, "layout", `nc-${documentoId}-${intento}`);
    if (!r) return;
    onCerrar();
    await enviarAlSiiTrasEmitir(r.id, "Nota de crédito");
  }

  return (
    <Sheet
      abierto={abierta}
      onCerrar={onCerrar}
      titulo="Emitir nota de crédito"
      descripcion={`Referencia este documento (${pesos(total)}). El tope acumulado de notas lo valida el servidor.`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={pendiente || !valido} onClick={() => void emitir()}>Emitir nota</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo="No se pudo emitir">{error}</Alerta> : null}
        <Campo etiqueta="Qué hace la nota" htmlFor="nc-codigo">
          <Select id="nc-codigo" valor={codigo} onCambiar={setCodigo} opciones={CODIGOS} />
        </Campo>
        {soloTexto ? (
          <Alerta tono="info" titulo="Sin monto">
            Esta nota solo corrige el texto del documento. No cambia lo que el cliente debe; el SII la registra por $1 simbólico.
          </Alerta>
        ) : (
          <Campo etiqueta="Monto (CLP)" htmlFor="nc-monto" ayuda="Total para anular; menos si es parcial.">
            <Input id="nc-monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} />
          </Campo>
        )}
        <Campo etiqueta="Motivo" htmlFor="nc-motivo" error={motivo.length > 0 && motivo.trim().length < 3 ? "Mínimo 3 caracteres." : undefined}>
          <Input id="nc-motivo" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
