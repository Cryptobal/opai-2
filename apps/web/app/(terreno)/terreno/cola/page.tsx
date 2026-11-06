import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";

import { dispositivoActual } from "@/lib/dispositivo";

import { ColaPendiente } from "../_componentes/cola-pendiente";

export const metadata = { title: "Cola sin conexión" };

/** Cola de Terreno del equipo emparejado; sin equipo activo, vuelve al inicio, que decide adónde ir. */
async function Contenido() {
  const equipo = await dispositivoActual();
  if (equipo?.estado !== "activo") redirect("/terreno");
  return <ColaPendiente />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}
