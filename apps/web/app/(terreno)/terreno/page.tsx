import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Loading } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tieneAccesoAPortal } from "@/lib/acceso-portal";
import { dispositivoActual } from "@/lib/dispositivo";
import { loginDe } from "@/lib/login-destino";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";
import { personasDelEquipo } from "@/lib/terreno-servidor";

import { AvisoTerrenoConSesion } from "./_componentes/aviso-sesion";
import { CargadorEquipo } from "./_componentes/cargador-equipo";

export const metadata = { title: "Terreno" };

/** Con sesión, cómo emparejar el equipo; sin sesión y con equipo emparejado, Terreno del equipo. */
async function Contenido() {
  const identidad = await identidadActual();
  if (identidad) {
    const puede = puedeDeIdentidad(identidad);
    return (
      <PaginaPortal portal="terreno" titulo="Terreno" ruta="/terreno">
        <AvisoTerrenoConSesion
          puedeDispositivos={
            tieneAccesoAPortal(identidad, "erp") && puede(PERMISOS_CORE.instalacionesRead)
          }
        />
      </PaginaPortal>
    );
  }
  const equipo = await dispositivoActual();
  if (!equipo) redirect(loginDe("/terreno"));
  if (equipo.estado !== "activo") redirect("/terreno/emparejar");
  const { instalacion, personas } = await personasDelEquipo(equipo);
  return <CargadorEquipo instalacion={instalacion} personas={personas} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <Contenido />
    </Suspense>
  );
}
