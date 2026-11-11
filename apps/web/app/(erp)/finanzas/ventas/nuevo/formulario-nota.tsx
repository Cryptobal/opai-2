"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Campo, Select } from "@opai/ds";

import type { CuentaFila } from "@/lib/tipos-maestros";

import { EmitirClienteTipo } from "./emitir-cliente";
import { EmitirNota } from "./emitir-nota";
import { EmitirSinClientes } from "./emitir-sin-clientes";
import type { TipoEmision } from "./emitir-util";

const EmitirNdCargo = dynamic(() => import("./emitir-nd-cargo").then((m) => ({ default: m.EmitirNdCargo })));

type Props = {
  cuentas: CuentaFila[];
  sinRut: number;
  tipoDte: "61" | "56";
  setTipoDte: (v: TipoEmision) => void;
  cuentaId: string | null;
  setCuentaId: (id: string | null) => void;
};

/** Emisión de una nota (61 o 56): cliente y tipo a la izquierda, el documento que se corrige a la derecha. */
export function FormularioNota({
  cuentas,
  sinRut,
  tipoDte,
  setTipoDte,
  cuentaId,
  setCuentaId,
}: Props) {
  const router = useRouter();
  // La nota de débito tiene dos usos (CAR-234): cargo sobre una factura (paridad con 1.0) o anular una nota de crédito.
  const [modoNd, setModoNd] = useState<"cargo" | "anula">("cargo");
  const panelNd =
    modoNd === "cargo" ? (
      <EmitirNdCargo key={`cargo-${cuentaId ?? ""}`} cuentaId={cuentaId} />
    ) : (
      <EmitirNota key={`56-${cuentaId ?? ""}`} tipo="56" cuentaId={cuentaId} />
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => router.push("/finanzas/ventas")}>
          Cancelar
        </Button>
      </div>
      <EmitirSinClientes hayClientes={cuentas.length > 0} sinRut={sinRut} />
      <div className="grid gap-6 lg:grid-cols-2">
        <EmitirClienteTipo
          cuentas={cuentas}
          documentoId={null}
          cuentaId={cuentaId}
          setCuentaId={setCuentaId}
          tipoDte={tipoDte}
          setTipoDte={setTipoDte}
          plazoPagoDias=""
          setPlazoPagoDias={() => undefined}
          glosa=""
          setGlosa={() => undefined}
        />
        {tipoDte === "56" ? (
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Qué hace la nota de débito" htmlFor="nd-modo">
              <Select
                id="nd-modo"
                valor={modoNd}
                onCambiar={(v) => setModoNd(v === "anula" ? "anula" : "cargo")}
                opciones={[
                  { valor: "cargo", etiqueta: "Agrega un cargo a una factura (corrige montos)" },
                  { valor: "anula", etiqueta: "Anula una nota de crédito" },
                ]}
              />
            </Campo>
            {panelNd}
          </div>
        ) : (
          <EmitirNota key={`${tipoDte}-${cuentaId ?? ""}`} tipo={tipoDte} cuentaId={cuentaId} />
        )}
      </div>
    </div>
  );
}
