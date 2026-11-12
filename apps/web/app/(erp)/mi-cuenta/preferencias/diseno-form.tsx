"use client";

import { useState } from "react";

import { RadioGroup, SeccionTarjeta } from "@opai/ds";

import { cambiarMarco } from "@/app/_components/hilo/marco-cliente";
import type { Marco } from "@/lib/marco";

const DISENOS = [
  { valor: "clasico", etiqueta: "Clásico", descripcion: "Menú lateral y barra superior" },
  {
    valor: "hilo",
    etiqueta: "Hilo",
    descripcion: "Tus pendientes, la pantalla de trabajo y la búsqueda al pie",
  },
  {
    valor: "nuevo",
    etiqueta: "Nuevo (vista previa)",
    descripcion: "El diseño que viene: blanco y negro, con el color de tu empresa",
  },
];

/**
 * Diseño de la aplicación (ADR-090, ADR-109): cada persona elige entre el clásico, el Hilo y el
 * nuevo, que está en vista previa mientras se construye. Al cambiar
 * se guarda la preferencia y la página se recarga con el otro marco; si no se pudo guardar, vuelve a
 * la opción anterior y avisa.
 */
export function DisenoForm({ inicial }: { inicial: Marco }) {
  const [marco, setMarco] = useState<Marco>(inicial);
  const [guardando, setGuardando] = useState(false);
  function elegir(valor: string) {
    const nuevo: Marco = valor === "hilo" || valor === "nuevo" ? valor : "clasico";
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
