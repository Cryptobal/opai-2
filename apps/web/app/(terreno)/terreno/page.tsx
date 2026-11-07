import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";

import { PortalPlaceholder } from "@/app/_components/portal-placeholder";
import { dispositivoActual } from "@/lib/dispositivo";
import { loginDe } from "@/lib/login-destino";
import { identidadActual } from "@/lib/servidor";
import { personasDelEquipo } from "@/lib/terreno-servidor";

import { PantallaEquipo } from "./_componentes/pantalla-equipo";

export const metadata = { title: "Terreno" };

/** Con sesión, el portal de siempre; sin sesión pero con un equipo emparejado (B2), Terreno del equipo (B3). */
async function Contenido() {
  if (await identidadActual())
    return <PortalPlaceholder portal="terreno" titulo="Terreno" ruta="/terreno" />;
  const equipo = await dispositivoActual();
  if (!equipo) redirect(loginDe("/terreno"));
  if (equipo.estado !== "activo") redirect("/terreno/emparejar");
  const { instalacion, personas } = await personasDelEquipo(equipo);
  return <PantallaEquipo instalacion={instalacion} personas={personas} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}
