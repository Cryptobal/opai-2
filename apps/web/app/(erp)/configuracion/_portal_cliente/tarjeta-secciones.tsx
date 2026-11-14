"use client";

import { SeccionTarjeta, Switch } from "@opai/ds";
import type { SeccionPortal } from "@opai/domain";

/** Secciones del resumen que la cuenta puede ocultar o encender (CAR-491 a CAR-493 y CAR-502). */
const SECCIONES: { s: SeccionPortal; etiqueta: string; descripcion: string }[] = [
  {
    s: "cobertura",
    etiqueta: "Cobertura de turnos",
    descripcion: "Turnos programados, cubiertos y por cubrir, sin nombres ni costos.",
  },
  {
    s: "rondas",
    etiqueta: "Rondas realizadas",
    descripcion: "Rondas cerradas, completas e incompletas, sin nombres de los guardias.",
  },
  {
    s: "novedades",
    etiqueta: "Novedades por gravedad",
    descripcion: "Solo cantidades por gravedad y cuántas siguen abiertas.",
  },
  {
    s: "novedades_texto",
    etiqueta: "Texto de las novedades",
    descripcion:
      "El cliente lee lo que escribe el guardia en el libro de cada instalación. Puede nombrar personas: actívalo solo si el contrato lo prevé.",
  },
];

/** Qué secciones del resumen del mes ve esta cuenta. La empresa puede además apagarlas para todos en Ajustes. */
export function TarjetaSecciones({
  visibles,
  onCambiar,
}: {
  visibles: SeccionPortal[];
  onCambiar: (visibles: SeccionPortal[]) => void;
}) {
  // Sin las novedades no hay texto que leer: apagarlas apaga también el texto.
  const marcar = (s: SeccionPortal, on: boolean) =>
    onCambiar(
      on
        ? [...visibles.filter((x) => x !== s), s]
        : visibles.filter((x) => x !== s && !(s === "novedades" && x === "novedades_texto")),
    );
  return (
    <SeccionTarjeta titulo="Secciones del resumen del mes">
      {SECCIONES.map(({ s, etiqueta, descripcion }) => (
        <Switch
          key={s}
          etiqueta={etiqueta}
          descripcion={descripcion}
          activo={visibles.includes(s)}
          disabled={s === "novedades_texto" && !visibles.includes("novedades")}
          onCambiar={(v) => marcar(s, v)}
        />
      ))}
    </SeccionTarjeta>
  );
}
