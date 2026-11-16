"use client";

import { Alerta, avisar, Button, Campo, Input, Select } from "@opai/ds";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { BloquePlantilla } from "@/lib/cpq-bloques-propuesta";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

import { EditorBloquesPropuesta } from "./editor-bloques-propuesta";

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
    bloques: BloquePlantilla[];
    basesDisponibles: string[];
  };
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [base, setBase] = useState(plantilla.base);
  const [nombreVisible, setNombreVisible] = useState(plantilla.nombreVisible);
  const [aperturaMaxima, setAperturaMaxima] = useState(plantilla.aperturaMaxima);
  const [bloques, setBloques] = useState(plantilla.bloques);

  async function guardar() {
    const r = await ejecutar("cpq.plantillas_propuesta.update", {
      base,
      nombreVisible,
      aperturaMaxima,
      bloques,
    });
    if (r == null) return;
    avisar.exito("Plantilla de propuesta guardada");
    router.refresh();
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
      <EditorBloquesPropuesta bloques={bloques} onCambiar={setBloques} />
      <p className="t-caption text-fg-muted">
        Cada cotización nueva hereda este orden; los cambios no alteran propuestas ya creadas.
      </p>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <Button type="submit" disabled={pendiente}>
        Guardar plantilla de propuesta
      </Button>
    </form>
  );
}
