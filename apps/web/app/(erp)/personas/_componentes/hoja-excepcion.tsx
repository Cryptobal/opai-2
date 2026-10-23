"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, InputFecha, Select, Sheet, Textarea } from "@opai/ds";

import { InputPesos } from "@/app/_components/maestros/input-pesos";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { EstructuraVista } from "@/lib/tipos-sueldo";

type Monto = "sueldoBase" | "colacion" | "movilizacion";
const MONTOS: { clave: Monto; etiqueta: string }[] = [
  { clave: "sueldoBase", etiqueta: "Sueldo base" },
  { clave: "colacion", etiqueta: "Colación" },
  { clave: "movilizacion", etiqueta: "Movilización" },
];

type Props = { personaId: string; actual: EstructuraVista | null; hoy: string; nombre: string };

/** Excepción de sueldo para una persona (13/57): solo los conceptos que cambian; el resto hereda. */
export function HojaExcepcion({ personaId, actual, hoy, nombre }: Props) {
  const hoja = useHojaUrl("excepcion");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const inicial = (k: Monto) => (actual && actual[k] !== null ? String(actual[k]) : "");
  const [m, setM] = useState<Record<Monto, string>>(() => ({
    sueldoBase: inicial("sueldoBase"),
    colacion: inicial("colacion"),
    movilizacion: inicial("movilizacion"),
  }));
  const [grat, setGrat] = useState(actual?.gratificacion ?? "hereda");
  const [desde, setDesde] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  const define = Object.values(m).some(Boolean) || grat !== "hereda";
  const invalido = !define || !desde || motivo.trim().length < 5;
  async function guardar() {
    const r = await ejecutar("core.estructuras.create", {
      nivel: "persona",
      personaId,
      vigenteDesde: desde,
      motivo: motivo.trim(),
      ...Object.fromEntries(
        MONTOS.filter((x) => m[x.clave]).map((x) => [x.clave, Number(m[x.clave])]),
      ),
      ...(grat !== "hereda" ? { gratificacion: grat } : {}),
    });
    if (!r) return;
    avisar.exito("Excepción guardada");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={actual ? "Editar excepción" : "Definir excepción"}
      descripcion={`Solo para ${nombre}. Deja en blanco lo que debe heredar del puesto o del cargo.`}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalido} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar excepción"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {MONTOS.map((x) => (
          <Campo
            key={x.clave}
            etiqueta={x.etiqueta}
            htmlFor={`e-${x.clave}`}
            ayuda="En blanco: hereda"
          >
            <InputPesos
              id={`e-${x.clave}`}
              valor={m[x.clave]}
              onCambiar={(v) => setM((y) => ({ ...y, [x.clave]: v }))}
            />
          </Campo>
        ))}
        <Campo etiqueta="Gratificación" htmlFor="e-grat">
          <Select
            id="e-grat"
            valor={grat}
            onCambiar={setGrat}
            opciones={[
              { valor: "hereda", etiqueta: "Hereda" },
              { valor: "legal_25", etiqueta: "Legal: 25 % con tope" },
              { valor: "ninguna", etiqueta: "Sin gratificación" },
            ]}
          />
        </Campo>
        <Campo etiqueta="Vigente desde" htmlFor="e-desde">
          <InputFecha id="e-desde" valor={desde} onCambiar={setDesde} />
        </Campo>
        <Campo
          etiqueta="Motivo"
          htmlFor="e-motivo"
          ayuda="Queda en el historial (mínimo 5 caracteres)"
        >
          <Textarea
            id="e-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
