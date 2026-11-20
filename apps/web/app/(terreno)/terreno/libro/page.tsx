import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";

import { dispositivoActual } from "@/lib/dispositivo";

import { CargadorLibro } from "./cargador";

export const metadata = { title: "Libro de novedades" };

/** Libro de novedades del equipo de terreno emparejado; sin equipo activo, vuelve al inicio. */
async function Contenido() {
  const equipo = await dispositivoActual();
  if (equipo?.estado !== "activo") redirect("/terreno");
  return <CargadorLibro />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}
