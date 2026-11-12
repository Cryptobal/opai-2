import { notFound } from "next/navigation";

import { MuestraNuevo } from "./muestra-nuevo";

export const metadata = { title: "Diseño · sistema nuevo" };

/**
 * Sistema de diseño nuevo (ADR-109, CAR-335 D1): la piel `data-marco="nuevo"` con las piezas del DS y
 * el color de la empresa. Sin sesión y solo fuera de producción, como `/ds` y `/ds/hilo`.
 */
export default function PaginaDsNuevo() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MuestraNuevo />;
}
