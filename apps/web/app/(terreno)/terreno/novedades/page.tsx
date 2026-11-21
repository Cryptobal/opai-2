import { PaginaNovedades } from "@/app/_components/novedades/pagina-novedades";
import { identidadActual } from "@/lib/servidor";

import { CargadorNovedadesTerreno } from "./cargador";

export const metadata = { title: "Novedades" };

/** Kiosco sin sesión: listado liviano. Con sesión ERP: shell de portal (ADR-044). */
export default async function NovedadesTerreno() {
  if (await identidadActual()) return <PaginaNovedades portal="terreno" />;
  return <CargadorNovedadesTerreno />;
}