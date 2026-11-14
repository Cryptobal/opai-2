"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { capacidadesDe, type CampoFicha, type EntidadCampos, type ValorCampo } from "./tipos";

const VACIO = "_vacio";
type Borrador = Record<string, string>;

const aTexto = (v: ValorCampo): string =>
  v === null ? "" : typeof v === "boolean" ? (v ? "si" : "no") : String(v);

function aValor(c: CampoFicha, t: string): ValorCampo {
  if (t === "" || t === VACIO) return null;
  if (c.tipo === "si_no") return t === "si";
  if (c.tipo === "numero") return Number(t.replace(",", "."));
  return t;
}

/** Botón «Editar» y hoja con un control por campo; guarda solo lo que cambió. */
export function EditarCampos(p: { tipo: EntidadCampos; id: string; campos: CampoFicha[] }) {
  const inicial = Object.fromEntries(p.campos.map((c) => [c.clave, aTexto(c.valor)]));
  const [abierto, setAbierto] = useState(false);
  const [b, setB] = useState<Borrador>(inicial);
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const cerrar = () => {
    setAbierto(false);
    limpiarError();
  };

  async function guardar() {
    const valores = Object.fromEntries(
      p.campos
        .filter((c) => (b[c.clave] ?? "") !== (inicial[c.clave] ?? ""))
        .map((c) => [c.clave, aValor(c, b[c.clave] ?? "")]),
    );
    if (Object.keys(valores).length === 0) return cerrar();
    const cap = capacidadesDe(p.tipo, p.id);
    if (await ejecutar(cap.set, { ...cap.entrada, valores })) {
      avisar.exito("Campos guardados");
      cerrar();
    }
  }

  const control = (c: CampoFicha) => {
    const id = `campo-${c.clave}`;
    const valor = b[c.clave] ?? "";
    const set = (v: string) => setB({ ...b, [c.clave]: v });
    if (c.tipo === "fecha") return <InputFecha id={id} valor={valor} onCambiar={set} />;
    if (c.tipo === "lista" || c.tipo === "si_no") {
      const opciones =
        c.tipo === "lista"
          ? c.opciones.map((o) => ({ valor: o, etiqueta: o }))
          : [
              { valor: "si", etiqueta: "Sí" },
              { valor: "no", etiqueta: "No" },
            ];
      return (
        <Select
          id={id}
          valor={valor || VACIO}
          onCambiar={set}
          opciones={[{ valor: VACIO, etiqueta: "Sin valor" }, ...opciones]}
        />
      );
    }
    return (
      <Input
        id={id}
        value={valor}
        maxLength={500}
        {...(c.tipo === "numero" ? { inputMode: "decimal" as const } : {})}
        onChange={(e) => set(e.target.value)}
      />
    );
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setAbierto(true)}>
        Editar
      </Button>
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Campos propios"
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
            <Campo
              key={c.clave}
              etiqueta={c.obligatorio ? `${c.etiqueta} (obligatorio)` : c.etiqueta}
              htmlFor={`campo-${c.clave}`}
            >
              {control(c)}
            </Campo>
          ))}
        </div>
      </Sheet>
    </>
  );
}
