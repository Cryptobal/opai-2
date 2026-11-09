"use client";

import { useRouter } from "next/navigation";

import { Button } from "@opai/ds";

import type { CuentaFila } from "@/lib/tipos-maestros";

import { EmitirClienteTipo } from "./emitir-cliente";
import { EmitirNota } from "./emitir-nota";
import { EmitirSinClientes } from "./emitir-sin-clientes";
import type { TipoEmision } from "./emitir-util";

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
        <EmitirNota key={`${tipoDte}-${cuentaId ?? ""}`} tipo={tipoDte} cuentaId={cuentaId} />
      </div>
    </div>
  );
}
