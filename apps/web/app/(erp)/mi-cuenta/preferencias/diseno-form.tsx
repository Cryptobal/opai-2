"use client";

import { useState } from "react";

import { RadioGroup, SeccionTarjeta } from "@opai/ds";

import { cambiarMarco } from "@/app/_components/hilo/marco-cliente";
import type { Marco } from "@/lib/marco";

const DISENOS = [
  {
    valor: "nuevo",
    etiqueta: "Nuevo",
    descripcion: "Blanco y negro, con el color de tu empresa",
  },
  { valor: "clasico", etiqueta: "Clásico", descripcion: "El diseño anterior: menú lateral y barra superior" },
  {
    valor: "hilo",
    etiqueta: "Hilo",
    descripcion: "El diseño anterior con tus pendientes y la búsqueda al pie",
  },
];

/**
 * Diseño de la aplicación (ADR-090, ADR-109): el nuevo es el predeterminado (CAR-335 D6); el
 * clásico y el Hilo siguen disponibles por un tiempo. Al cambiar
 * se guarda la preferencia y la página se recarga con el otro marco; si no se pudo guardar, vuelve a
 * la opción anterior y avisa.
 */
export function DisenoForm({ inicial }: { inicial: Marco }) {
  const [marco, setMarco] = useState<Marco>(inicial);
  const [guardando, setGuardando] = useState(false);
  function elegir(valor: string) {
    const nuevo: Marco = valor === "hilo" || valor === "clasico" ? valor : "nuevo";
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
          El diseño nuevo está en construcción y por ahora solo en el ERP: el menú y los colores ya
          cambian, y las pantallas se irán sumando. Los datos son los mismos. Puedes volver al
          clásico cuando quieras.
        </p>
      </div>
    </SeccionTarjeta>
  );
}
