import { notFound } from "next/navigation";

import type { EstadoPantalla } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { accesoCpq } from "@/lib/cpq-ui";

import { FichaCotizacion } from "./_componentes/ficha-cotizacion";

export type DatosFicha = {
  state: EstadoPantalla;
  gestionar: boolean;
  ficha: FichaRespuesta | null;
};

type FichaRespuesta = {
  cotizacion: { id: string; codigo: string; titulo: string; negocioId: string; vigente: boolean };
  negocioTitulo: string | null;
  calculo: Record<string, unknown>;
  version: { editable: boolean; estado: string; validaHasta: string | null; numero: number };
  secciones: { id: string; nombre: string; lineas: { id: string; nombre: string; tipo: string }[] }[];
};

async function cargarFicha(id: string): Promise<DatosFicha> {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) return { state: "forbidden", gestionar: false, ficha: null };
  const r = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
  if (!r.ok) {
    if (r.error.code === "NOT_FOUND") notFound();
    return { state: estadoPantalla(r), gestionar: false, ficha: null };
  }
  return { state: "ready", gestionar: acceso.crear, ficha: r.data };
}

export default async function CotizacionFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cotización"
      ruta={`/cotizaciones/${id}`}
      cargar={() => cargarFicha(id)}
      opciones={(d) => ({ titulo: d.ficha?.cotizacion.codigo ?? "Cotización" })}
    >
      {(d) => <FichaCotizacion datos={d} />}
    </PaginaPortal>
  );
}
