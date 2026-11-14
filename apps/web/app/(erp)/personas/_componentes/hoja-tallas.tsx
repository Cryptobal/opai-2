"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { TallaPrenda } from "./estado-ficha";

/**
 * Tallas por prenda del uniforme de la empresa (CAR-408): una casilla por prenda del kit (las de la empresa o las de
 * su rubro). Envía solo las que cambiaron; vaciar una casilla borra la talla.
 */
export function HojaTallas({
  personaId,
  tallas,
}: {
  personaId: string;
  tallas: readonly TallaPrenda[];
}) {
  const hoja = useHojaUrl("editar-tallas");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const kit = tallas.filter((t) => t.enKit);
  const inicial = Object.fromEntries(kit.map((t) => [t.prenda, t.talla ?? ""]));
  const [v, setV] = useState<Record<string, string>>(inicial);
  // Al volver a abrir la hoja parte de lo guardado, no de lo que quedó escrito al cancelar.
  const [abierta, setAbierta] = useState(hoja.abierta);
  if (hoja.abierta !== abierta) {
    setAbierta(hoja.abierta);
    if (hoja.abierta) setV(inicial);
  }
  const cambios = Object.fromEntries(
    kit
      .filter((t) => (v[t.prenda] ?? "").trim() !== (inicial[t.prenda] ?? "").trim())
      .map((t) => [t.prenda, (v[t.prenda] ?? "").trim() || null]),
  );
  const sinCambios = Object.keys(cambios).length === 0;
  async function guardar() {
    const r = await ejecutar("core.personas.laboral_actualizar", {
      id: personaId,
      uniforme: { tallas: cambios },
    });
    if (!r) return;
    avisar.exito("Tallas actualizadas");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Editar tallas"
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || sinCambios} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={pendiente}>
        {error ? (
          <Alerta tono="danger" titulo="No se pudo guardar">
            {error}
          </Alerta>
        ) : null}
        <fieldset disabled={pendiente} className="grid grid-cols-2 gap-3.5">
          {kit.map((t) => (
            <Campo key={t.prenda} etiqueta={t.nombre} htmlFor={`talla-${t.prenda}`}>
              <Input
                id={`talla-${t.prenda}`}
                value={v[t.prenda] ?? ""}
                maxLength={20}
                onChange={(e) => setV((a) => ({ ...a, [t.prenda]: e.target.value }))}
              />
            </Campo>
          ))}
        </fieldset>
        <p className="t-caption">
          Las prendas salen del uniforme de tu empresa (Configuración › Personas).
        </p>
      </div>
    </Sheet>
  );
}
