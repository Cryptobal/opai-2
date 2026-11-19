"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ControlCampo, type Entrada } from "./control-campo";
import { entradaDe, type CampoFicha, type EntidadCampos, type ValorCampo } from "./tipos";

type Borrador = Record<string, Entrada>;

function aEntrada(v: ValorCampo): Entrada {
  if (v === null) return null;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v;
  return String(v);
}

function igual(a: Entrada, b: Entrada): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return String(a) === String(b);
}

function CampoEditable(p: { c: CampoFicha; valor: Entrada; onCambiar: (v: Entrada) => void }) {
  const { c } = p;
  return (
    <Campo
      etiqueta={c.obligatorio ? `${c.etiqueta} (obligatorio)` : c.etiqueta}
      htmlFor={`campo-${c.clave}`}
      {...(c.descripcion ? { ayuda: c.descripcion } : {})}
    >
      <ControlCampo c={c} id={`campo-${c.clave}`} valor={p.valor} onCambiar={p.onCambiar} />
    </Campo>
  );
}

async function guardarCambios(p: {
  campos: CampoFicha[];
  tipo: EntidadCampos;
  id: string;
  b: Borrador;
  guardado: Borrador;
  ejecutar: ReturnType<typeof useCapacidad>["ejecutar"];
  cerrar: () => void;
}) {
  const valores = Object.fromEntries(
    p.campos
      .filter((c) => !igual(p.b[c.clave] ?? null, p.guardado[c.clave] ?? null))
      .map((c) => [c.clave, p.b[c.clave] ?? null]),
  );
  if (Object.keys(valores).length === 0) return p.cerrar();
  const input = { ...entradaDe(p.tipo, p.id), valores };
  const ok =
    p.tipo === "negocio"
      ? await p.ejecutar("comercial.negocio_campos.set", input)
      : await p.ejecutar("core.valores_personalizados.set", input);
  if (ok) {
    avisar.exito("Campos guardados");
    p.cerrar();
  }
}

/**
 * Botón «Editar» y hoja con un control por campo; guarda solo lo que cambió. Un campo vacío con valor
 * por defecto lo propone ya cargado (se guarda al confirmar).
 */
export function EditarCampos(p: { tipo: EntidadCampos; id: string; campos: CampoFicha[] }) {
  const guardado = Object.fromEntries(p.campos.map((c) => [c.clave, aEntrada(c.valor)]));
  const propuesto = () =>
    Object.fromEntries(p.campos.map((c) => [c.clave, aEntrada(c.valor ?? c.valorDefecto)]));
  const [abierto, setAbierto] = useState(false);
  const [b, setB] = useState<Borrador>(propuesto);
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const cerrar = () => {
    setAbierto(false);
    limpiarError();
  };
  const abrir = () => {
    setB(propuesto());
    setAbierto(true);
  };

  return (
    <>
      <Button variant="ghost" onClick={abrir}>
        Editar
      </Button>
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Editar campos"
        acciones={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              disabled={pendiente}
              onClick={() =>
                void guardarCambios({
                  campos: p.campos,
                  tipo: p.tipo,
                  id: p.id,
                  b,
                  guardado,
                  ejecutar,
                  cerrar,
                })
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {p.campos.map((c) => (
            <CampoEditable
              key={c.clave}
              c={c}
              valor={b[c.clave] ?? null}
              onCambiar={(v) => setB({ ...b, [c.clave]: v })}
            />
          ))}
        </div>
      </Sheet>
    </>
  );
}