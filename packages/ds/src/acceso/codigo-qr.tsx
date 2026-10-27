import { cn } from "../cn";

/**
 * Muestra un QR ya renderizado (SVG) como imagen escaneable. El SVG se genera en el servidor con
 * `qrSvg`; aquí solo se presenta sobre fondo claro para que el lector funcione en tema claro u oscuro.
 */
export function CodigoQr({
  svg,
  alt = "Código QR para el autenticador",
  className,
}: {
  svg: string;
  alt?: string;
  className?: string;
}) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return (
    <img
      src={src}
      alt={alt}
      width={192}
      height={192}
      className={cn("size-48 rounded-lg bg-white p-3", className)}
    />
  );
}
