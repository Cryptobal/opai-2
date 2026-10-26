import { DIAS_SEMANA, type Patron } from "./tipos";

/**
 * Vista del ciclo de un patrón (como en el export de DS 2.0): cuadros de trabajo (relleno de
 * acento) y de descanso (contorno con el token de borde de control del DS). `role="img"` con el
 * texto descriptivo para lectores de pantalla. El borde de control del DS en `main` es
 * `--ds-border-strong` (el export v2 lo llama `--ds-border-control`); se usa el del DS de `main`.
 */
export function VistaCiclo({ patron }: { patron: Patron }) {
  const semanal = patron.clase === "semanal";
  const total = semanal ? 7 : patron.diasTrabajo + patron.diasDescanso;
  const trabaja = (i: number) =>
    semanal ? patron.diasSemana.includes(i + 1) : i < patron.diasTrabajo;
  const etiqueta = semanal
    ? `Trabaja ${patron.diasSemana.map((d) => DIAS_SEMANA[d - 1]).join(", ")}`
    : `${patron.diasTrabajo} días de trabajo y ${patron.diasDescanso} días de descanso`;
  return (
    <span role="img" aria-label={etiqueta} className="inline-flex flex-wrap gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            trabaja(i)
              ? "size-3 rounded-[3px] bg-accent"
              : "size-3 rounded-[3px] border border-strong bg-surface"
          }
        />
      ))}
    </span>
  );
}
