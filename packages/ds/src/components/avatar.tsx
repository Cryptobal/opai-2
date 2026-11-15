import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../cn";

const estilos = cva(
  "inline-flex flex-none items-center justify-center rounded-full bg-border text-fg-muted font-semibold tracking-wide select-none",
  {
    variants: {
      size: {
        sm: "size-6 text-[10px]",
        md: "size-8 text-xs",
        lg: "size-10 text-base",
        xl: "size-12 text-lg md:size-16 md:text-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type AvatarProps = VariantProps<typeof estilos> & { nombre: string; className?: string };

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] ?? "";
  const ultima =
    partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : (partes[0]?.[1] ?? "");
  return `${primera}${ultima}`.toUpperCase();
}

/** Avatar de iniciales. Nunca fotos en listas: coste y privacidad. */
export function Avatar({ nombre, size, className }: AvatarProps) {
  return (
    <span aria-hidden title={nombre} className={cn(estilos({ size }), className)}>
      {iniciales(nombre)}
    </span>
  );
}

/**
 * Monograma del tenant: cuadrado 24px. Con `logo` (CAR-335 D6b) muestra la imagen de la marca; sin
 * logo, las iniciales con fondo inverso, que la piel nueva pinta con el color de la empresa.
 */
export function Monograma({
  nombre,
  logo,
  className,
}: {
  nombre: string;
  logo?: string | undefined;
  className?: string;
}) {
  const base = "inline-flex size-6 flex-none items-center justify-center rounded-sm";
  if (logo)
    return (
      <img src={logo} alt="" aria-hidden className={cn(base, "bg-bg object-contain", className)} />
    );
  return (
    <span
      aria-hidden
      data-monograma
      className={cn(
        base,
        "bg-inverse-bg text-[10px] leading-none font-bold tracking-wide text-inverse-fg",
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
