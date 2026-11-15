"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ControlCampo, type Entrada } from "./control-campo";
import { entradaDe, type CampoFicha, type EntidadCampos, type ValorCampo } from "./tipos";

type Borrador = Record<string, Entrada>;

const aEntrada = (v: ValorCampo): Entrada => (typeof v === "number" ? String(v) : v);
const igual = (a: Entrada | undefined, b: Entrada | undefined) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

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

  async function guardar() {
    const valores = Object.fromEntries(
      p.campos
        .filter((c) => !igual(b[c.clave], guardado[c.clave]))
        .map((c) => [c.clave, b[c.clave] ?? null]),
    );
    if (Object.keys(valores).length === 0) return cerrar();
    const input = { ...entradaDe(p.tipo, p.id), valores };
    const ok =
      p.tipo === "negocio"
        ? await ejecutar("comercial.negocio_campos.set", input)
        : await ejecutar("core.valores_personalizados.set", input);
    if (ok) {
      avisar.exito("Campos guardados");
      cerrar();
    }
  }

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
            <Button disabled={pendiente} onClick={() => void guardar()}>
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
