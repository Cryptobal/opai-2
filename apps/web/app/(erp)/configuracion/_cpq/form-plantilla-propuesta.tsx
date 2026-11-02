"use client";

import { Button, Campo, Input, Select } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

const APERTURAS = [
  { valor: "por_instalacion", etiqueta: "Por instalación" },
  { valor: "por_categoria", etiqueta: "Por categoría" },
  { valor: "por_item", etiqueta: "Por ítem (máxima)" },
] as const;

export function FormPlantillaPropuesta({
  plantilla,
}: {
  plantilla: {
    base: string;
    nombreVisible: string;
    aperturaMaxima: string;
    bloques: { id: string; activo: boolean; fijo: boolean; opcional: boolean }[];
    basesDisponibles: string[];
  };
}) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [base, setBase] = useState(plantilla.base);
  const [nombreVisible, setNombreVisible] = useState(plantilla.nombreVisible);
  const [aperturaMaxima, setAperturaMaxima] = useState(plantilla.aperturaMaxima);
  const [bloques, setBloques] = useState(plantilla.bloques);

  async function guardar() {
    const r = await ejecutar("cpq.plantillas_propuesta.update", {
      base,
      nombreVisible,
      aperturaMaxima,
      bloques: bloques.map((b) => ({
        id: b.id,
        activo: b.activo,
        fijo: b.fijo,
        opcional: b.opcional,
      })),
    });
    if (r != null) router.refresh();
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <Campo etiqueta="Nombre visible del documento" htmlFor="cpq-propuesta-nombre">
        <Input
          id="cpq-propuesta-nombre"
          value={nombreVisible}
          onChange={(e) => setNombreVisible(e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Plantilla base" htmlFor="cpq-propuesta-base">
        <Select
          id="cpq-propuesta-base"
          valor={base}
          onCambiar={setBase}
          opciones={plantilla.basesDisponibles.map((b) => ({
            valor: b,
            etiqueta: etiquetaBasePlantillaCpq(b),
          }))}
        />
      </Campo>
      <Campo etiqueta="Apertura máxima del resumen económico" htmlFor="cpq-propuesta-apertura">
        <Select
          id="cpq-propuesta-apertura"
          valor={aperturaMaxima}
          onCambiar={setAperturaMaxima}
          opciones={APERTURAS.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta }))}
        />
      </Campo>
      <p className="t-caption text-fg-muted">
        El armador hereda la base de la cotización; aquí defines el orden por defecto y qué bloques son fijos u opcionales.
      </p>
      <Button type="submit" disabled={pendiente}>
        Guardar plantilla de propuesta
      </Button>
    </form>
  );
}
