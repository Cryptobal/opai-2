"use client";

import { useState } from "react";

import { RadioGroup, SeccionTarjeta } from "@opai/ds";

import { cambiarMarco } from "@/app/_components/hilo/marco-cliente";
import type { Marco } from "@/lib/marco";

const DISENOS = [
  { valor: "clasico", etiqueta: "Clásico", descripcion: "Menú lateral y barra superior" },
  { valor: "hilo", etiqueta: "Hilo", descripcion: "Tus pendientes, la pantalla de trabajo y la búsqueda al pie" },
];

/**
 * Diseño de la aplicación (ADR-090): cada persona elige entre el marco clásico y el Hilo. Al cambiar
 * se guarda la preferencia y la página se recarga con el otro marco; si no se pudo guardar, vuelve a
 * la opción anterior y avisa.
 */
export function DisenoForm({ inicial }: { inicial: Marco }) {
  const [marco, setMarco] = useState<Marco>(inicial);
  const [guardando, setGuardando] = useState(false);
  function elegir(valor: string) {
    const nuevo: Marco = valor === "hilo" ? "hilo" : "clasico";
    if (nuevo === marco || guardando) return;
    const anterior = marco;
    setMarco(nuevo);
    setGuardando(true);
    void cambiarMarco("erp", nuevo).then((ok) => {
      if (ok) return;
      setMarco(anterior);
      setGuardando(false);
    });
  }
  return (
    <SeccionTarjeta titulo="Diseño">
      <div className="flex flex-col gap-3">
        <RadioGroup etiqueta="Diseño" valor={marco} opciones={DISENOS} onCambiar={elegir} />
        <p className="t-caption">
          El diseño Hilo está en construcción: por ahora está solo en el ERP. Las pantallas tienen
          los mismos campos y datos, con el estilo nuevo. Puedes volver al clásico cuando quieras.
        </p>
      </div>
    </SeccionTarjeta>
  );
}
