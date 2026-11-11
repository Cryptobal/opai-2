import type { SVGProps } from "react";

/** Trazos del diseño aprobado (docs/2.0/design/export-base-hilo/fuente/gen.py), grosor 1,8. */
const TRAZOS = {
  chispa: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  subir: "M12 19V5M6 11l6-6 6 6",
  pulso: "M3 12h4l3-8 4 16 3-8h4",
  indice: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  luna: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  atras: "M15 6l-6 6 6 6",
  flecha: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  hilo: "M4 6h16M4 12h16M4 18h10",
  cambio: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  buscar: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.9-3.9",
} as const;

export type NombreIconoHilo = keyof typeof TRAZOS;

type Props = { nombre: NombreIconoHilo; tam?: number } & Omit<SVGProps<SVGSVGElement>, "name">;

/** Icono del marco Hilo: decorativo; el nombre accesible lo pone el control que lo lleva. */
export function IconoHilo({ nombre, tam = 20, ...resto }: Props) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...resto}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
