import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";

import { dispositivoActual } from "@/lib/dispositivo";

import { CargadorRondas } from "./cargador";

export const metadata = { title: "Mis rondas" };

/** Rondas del equipo de terreno emparejado; sin equipo activo, vuelve al inicio, que decide adónde ir. */
async function Contenido() {
  const equipo = await dispositivoActual();
  if (equipo?.estado !== "activo") redirect("/terreno");
  return <CargadorRondas />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}
