import { cn } from "../cn";

type ChipVariableProps = {
  /** Clave sin llaves: `persona.rut`. Se muestra como `{persona.rut}`. */
  clave: string;
  /** `false` marca una variable que no existe en el catálogo (rojo, subrayado ondulado). */
  conocida?: boolean;
  /** Con `onInsertar` es un botón (panel de variables); sin él, una pastilla dentro del texto. */
  onInsertar?: () => void;
  /** Texto de ayuda (etiqueta humana de la variable), como `title` y nombre accesible. */
  descripcion?: string;
  className?: string;
};

/**
 * Pastilla de variable de plantilla (export documentos v4, «Nuevo» en la hoja de componentes): estilo
 * `t-overline` + `t-mono`. En el texto, acento si existe y peligro si no; en el panel, botón con borde
 * que inserta la variable. Táctil de 44 px en teléfono.
 */
export function ChipVariable({
  clave,
  conocida = true,
  onInsertar,
  descripcion,
  className,
}: ChipVariableProps) {
  const texto = `{${clave}}`;
  if (onInsertar)
    return (
      <button
        type="button"
        onClick={onInsertar}
        title={descripcion ? `${descripcion} · ${texto}` : texto}
        aria-label={descripcion ? `Insertar ${descripcion} ${texto}` : `Insertar ${texto}`}
        className={cn(
          "t-overline t-mono inline-flex h-11 max-w-full items-center truncate rounded-sm border border-border-strong bg-surface px-2 text-fg outline-none transition-colors duration-150 hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none md:h-7",
          className,
        )}
      >
        <span className="truncate">{texto}</span>
      </button>
    );
  return (
    <span
      title={conocida ? descripcion : "Esta variable no existe"}
      className={cn(
        "t-overline t-mono rounded-sm px-1 py-px",
        conocida
          ? "bg-accent-muted text-accent"
          : "bg-danger-muted text-danger-fg underline decoration-wavy",
        className,
      )}
    >
      {texto}
    </span>
  );
}
