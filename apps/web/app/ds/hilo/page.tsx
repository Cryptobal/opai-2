import { notFound } from "next/navigation";
import { Suspense } from "react";

import { leerParametros, type SearchParams } from "@/lib/parametros";

import { MuestraHilo, type ParametrosMuestra } from "./muestra-hilo";

export const metadata = { title: "Diseño · marco Hilo" };

const de = <T extends string>(valor: string | undefined, validos: readonly T[], defecto: T): T =>
  validos.includes(valor as T) ? (valor as T) : defecto;

async function Muestra({ searchParams }: { searchParams: SearchParams }) {
  const p = await leerParametros(searchParams);
  const panel = de(p["panel"], ["indice", "portales", ""] as const, "");
  const segmento = de(p["segmento"], ["pendientes", "actividad", "agenda", ""] as const, "");
  const props: ParametrosMuestra = {
    vista: de(p["vista"], ["inicio", "pantalla", "ancha", "piezas"] as const, "inicio"),
    estado: de(p["estado"], ["listo", "vacio", "cargando", "error", "sin-permiso"] as const, "listo"),
    ...(panel ? { panel } : {}),
    ...(segmento ? { segmento } : {}),
    agente: p["agente"] !== "no",
  };
  return <MuestraHilo {...props} />;
}

/** Marco «Hilo» (ADR-090) con todos sus estados, sin sesión. Solo fuera de producción, como `/ds`. */
export default function PaginaDsHilo({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Muestra searchParams={searchParams} />
    </Suspense>
  );
}
