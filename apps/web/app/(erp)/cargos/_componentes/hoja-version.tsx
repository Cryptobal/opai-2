"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, InputFecha, Select, Sheet, Textarea } from "@opai/ds";

import { InputPesos } from "@/app/_components/maestros/input-pesos";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { EstructuraVista } from "@/lib/tipos-sueldo";

type Props = { cargoId: string; base: EstructuraVista | undefined; hoy: string };
const texto = (n: number | null | undefined) => (n == null ? "" : String(n));

/** Nueva versión de la estructura del cargo (15): parte de la vigente; cierra la anterior. */
export function HojaVersion({ cargoId, base, hoy }: Props) {
  const hoja = useHojaUrl("version");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [sueldoBase, setBase] = useState(() => (base?.sensible ? "" : texto(base?.sueldoBase)));
  const [colacion, setColacion] = useState(() => (base?.sensible ? "" : texto(base?.colacion)));
  const [movilizacion, setMov] = useState(() => (base?.sensible ? "" : texto(base?.movilizacion)));
  const [grat, setGrat] = useState(base?.gratificacion ?? "legal_25");
  const [desde, setDesde] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  async function guardar() {
    const r = await ejecutar("core.estructuras.create", {
      nivel: "cargo",
      cargoId,
      sueldoBase: Number(sueldoBase),
      colacion: Number(colacion || 0),
      movilizacion: Number(movilizacion || 0),
      gratificacion: grat,
      vigenteDesde: desde,
      ...(motivo.trim().length >= 5 ? { motivo: motivo.trim() } : {}),
      // Los bonos de la versión anterior se conservan.
      items: base && !base.sensible ? base.items : [],
    });
    if (!r) return;
    avisar.exito("Versión creada");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Crear versión"
      descripcion="La versión vigente se cierra el día anterior a la nueva fecha."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !sueldoBase || !desde} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Crear versión"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {base?.sensible ? (
          <Alerta
            tono="neutral"
            titulo="Montos sensibles: ingrésalos completos para la nueva versión."
          />
        ) : null}
        <Campo etiqueta="Sueldo base" htmlFor="v-base">
          <InputPesos id="v-base" valor={sueldoBase} onCambiar={setBase} />
        </Campo>
        <Campo etiqueta="Colación" htmlFor="v-col" ayuda="No imponible">
          <InputPesos id="v-col" valor={colacion} onCambiar={setColacion} />
        </Campo>
        <Campo etiqueta="Movilización" htmlFor="v-mov" ayuda="No imponible">
          <InputPesos id="v-mov" valor={movilizacion} onCambiar={setMov} />
        </Campo>
        <Campo etiqueta="Gratificación" htmlFor="v-grat">
          <Select
            id="v-grat"
            valor={grat}
            onCambiar={setGrat}
            opciones={[
              { valor: "legal_25", etiqueta: "Legal: 25 % con tope" },
              { valor: "ninguna", etiqueta: "Sin gratificación" },
            ]}
          />
        </Campo>
        <Campo etiqueta="Vigente desde" htmlFor="v-desde">
          <InputFecha id="v-desde" valor={desde} onCambiar={setDesde} />
        </Campo>
        <Campo etiqueta="Motivo" htmlFor="v-motivo" ayuda="Opcional (reajuste IPC, negociación…)">
          <Textarea
            id="v-motivo"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
