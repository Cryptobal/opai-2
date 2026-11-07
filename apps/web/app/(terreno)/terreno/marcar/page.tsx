import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { dispositivoActual } from "@/lib/dispositivo";
import { loginDe } from "@/lib/login-destino";
import { identidadActual } from "@/lib/servidor";

import { MarcarEquipo } from "../_componentes/marcar-equipo";

export const metadata = { title: tituloPagina("terreno", "Marcar") };

/**
 * Terreno · Marcación en el equipo del kiosco (export-terreno «Marcación», con los ajustes de D-02/D-03: prueba de
 * vida obligatoria con el rostro, «Usar PIN» siempre visible, sin foto por marca D-04). La instalación y el equipo
 * salen de la cookie del dispositivo, en el servidor; la persona se identifica con su PIN.
 */
async function Contenido() {
  if (!(await dispositivoActual())) {
    if (await identidadActual()) redirect("/trabajador/marcar");
    redirect(loginDe("/terreno/marcar"));
  }
  return <MarcarEquipo />;
}

export default function Pagina() {
  return (
    <PaginaPortal portal="terreno" titulo="Marcar" ruta="/terreno/marcar" volver={{ href: "/terreno", etiqueta: "Inicio" }}>
      <Suspense fallback={<Loading variante="detalle" />}>
        <Contenido />
      </Suspense>
    </PaginaPortal>
  );
}
