import { redirect } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FormularioEstablecerPin } from "../_componentes/formulario-establecer-pin";
import { DesactivarEnVista } from "@/app/_components/ver-como/solo-lectura";

export const metadata = { title: tituloPagina("trabajador", "Crear PIN") };

type MiPin = { tienePin: boolean; debeCambiar: boolean };

/** Primer ingreso: la persona crea su PIN (CAR-803). */
export default async function Pagina() {
  const r = await ejecutarComoUsuario<MiPin>("trabajador", "core.credenciales_terreno.mi_estado", {});
  if (r.ok && r.data.tienePin && !r.data.debeCambiar) redirect("/trabajador");
  if (r.ok && r.data.tienePin && r.data.debeCambiar) redirect("/trabajador/cambiar-pin?primero=1");

  return (
    <PaginaPortal portal="trabajador" titulo="Crear PIN" ruta="/trabajador/crear-pin">
      <DesactivarEnVista>
        <FormularioEstablecerPin />
      </DesactivarEnVista>
    </PaginaPortal>
  );
}