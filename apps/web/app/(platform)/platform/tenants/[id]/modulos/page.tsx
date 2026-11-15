import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { PaginaTenant } from "../pagina-tenant";
import { Modulos } from "../modulos-tab";

export const metadata = { title: "Módulos de la empresa" };

/** Plataforma → empresa · Módulos: activar, suspender o dejar en prueba. */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const identidad = await identidadActual();
  const puedeNuevos = identidad
    ? puedeDeIdentidad(identidad)(PERMISOS_PLATAFORMA.modulesManage)
    : false;
  return (
    <PaginaTenant params={params} tab="modulos">
      {(d) => <Modulos detalle={d} puedeNuevos={puedeNuevos} />}
    </PaginaTenant>
  );
}
