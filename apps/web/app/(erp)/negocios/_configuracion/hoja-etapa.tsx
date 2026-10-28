"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Etapa } from "../_componentes/hojas/tipos";
import { REQUISITO, TONO } from "./etiquetas";

type Props = { etapa: Etapa | null; posicion: number; onCerrar: () => void };

// Una etapa abierta no pide motivo de pérdida; la perdida lo exige siempre (lo valida «Perder»).
const REQUISITOS_ABIERTA = ["monto", "fecha_cierre", "cotizacion_enviada", "inicio_servicio"];

/** Agregar o editar una etapa: nombre, probabilidad, tono y requisitos de entrada (R9). */
export function HojaEtapa({ etapa, posicion, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(etapa?.nombre ?? "");
  const [prob, setProb] = useState(String(etapa?.probabilidad ?? 0));
  const [tono, setTono] = useState(etapa?.tono ?? "neutral");
  const [exige, setExige] = useState<string[]>(etapa?.exige ?? []);
  const requisitos = etapa?.tipo === "perdida" ? ["motivo_perdida"] : REQUISITOS_ABIERTA;
  async function guardar() {
    const datos = {
      nombre: nombre.trim(),
      probabilidad: Math.min(100, Number(prob) || 0),
      tono,
      exige,
    };
    const r = etapa
      ? await ejecutar("comercial.config.actualizar_etapa", { id: etapa.id, ...datos })
      : await ejecutar("comercial.config.crear_etapa", { ...datos, posicion });
    if (!r) return;
    avisar.exito(etapa ? "Etapa guardada" : "Etapa agregada");
    onCerrar();
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={etapa ? `Editar ${etapa.nombre}` : "Agregar etapa"}
      {...(etapa
        ? {}
        : { descripcion: "Se agrega como etapa abierta, antes de la ganada y la perdida." })}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || nombre.trim().length < 2} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : etapa ? "Guardar" : "Agregar etapa"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="etapa-nombre">
          <Input
            id="etapa-nombre"
            maxLength={60}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Probabilidad (%)" htmlFor="etapa-prob">
            <Input
              id="etapa-prob"
              inputMode="numeric"
              className="t-numeric"
              value={prob}
              onChange={(e) => setProb(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </Campo>
          <Campo etiqueta="Tono" htmlFor="etapa-tono">
            <Select
              id="etapa-tono"
              valor={tono}
              onCambiar={setTono}
              opciones={Object.entries(TONO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
            />
          </Campo>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="t-label mb-1 text-fg">Pide para entrar</legend>
          {requisitos.map((r) => (
            <Checkbox
              key={r}
              etiqueta={REQUISITO[r] ?? r}
              marcado={exige.includes(r)}
              onCambiar={(v) => setExige((xs) => (v ? [...xs, r] : xs.filter((x) => x !== r)))}
            />
          ))}
        </fieldset>
      </div>
    </Sheet>
  );
}
