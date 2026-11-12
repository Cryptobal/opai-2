/** Píldora roja de pendientes, compartida por el contador del riel, la barra lateral y el menú. */
export const PILDORA_ROJA =
  "t-numeric flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 leading-none font-semibold text-white dark:bg-danger dark:text-inverse-fg";

export function Contador({ n }: { n?: number | undefined }) {
  return n ? (
    <span
      className={`${PILDORA_ROJA} absolute -top-1.5 left-1/2 ml-1.5 text-[11px] shadow-[0_0_0_2px_var(--ds-surface)]`}
    >
      {n}
    </span>
  ) : null;
}

/**
 * Punto de no leído, sin número (D5, D6 del Brief 05): en Inicio de la barra inferior y en la
 * campana. El número solo aparece dentro de la Bandeja.
 */
export function Punto({
  visible,
  peligro,
}: {
  visible?: boolean | undefined;
  /** Rojo de alerta (p. ej. novedades sin leer); por defecto acento. */
  peligro?: boolean | undefined;
}) {
  return visible ? (
    <span
      aria-hidden
      className={
        peligro
          ? "absolute top-0 right-0 size-2 flex-none rounded-full bg-danger-fg shadow-[0_0_0_2px_var(--ds-surface)] dark:bg-danger"
          : "absolute top-0 right-0 size-2 flex-none rounded-full bg-accent shadow-[0_0_0_2px_var(--ds-surface)]"
      }
    />
  ) : null;
}
