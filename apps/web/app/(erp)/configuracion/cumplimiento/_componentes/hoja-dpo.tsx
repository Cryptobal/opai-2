"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EstadoDpa } from "./datos";

const nulo = (v: string) => v.trim() || null;

/** Designar o editar el DPO de la empresa (`?dpo=1`): nombre, correo y teléfono. */
export function HojaDpo({ dpo }: { dpo: EstadoDpa["dpo"] }) {
  const hoja = useHojaUrl("dpo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(dpo.nombre ?? "");
  const [correo, setCorreo] = useState(dpo.correo ?? "");
  const [tel, setTel] = useState(dpo.telefono ?? "");
  async function guardar() {
    const r = await ejecutar("core.cumplimiento.dpo_set", {
      nombre: nulo(nombre),
      correo: nulo(correo),
      telefono: nulo(tel),
    });
    if (!r) return;
    avisar.exito("DPO guardado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Delegado de protección de datos"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || nombre.trim().length < 2} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="dpo-nombre">
          <Input id="dpo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="Correo"
          htmlFor="dpo-correo"
          ayuda="Lo verán los titulares para ejercer sus derechos"
        >
          <Input
            id="dpo-correo"
            type="email"
            inputMode="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor="dpo-tel" ayuda="Opcional">
          <Input
            id="dpo-tel"
            inputMode="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
