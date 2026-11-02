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
  aprobar: boolean;
  aprobarEnvios: boolean;
  ficha: (FichaRespuesta & { meta?: Record<string, unknown> }) | null;
};

type FichaRespuesta = {
  cotizacion: { id: string; codigo: string; titulo: string; negocioId: string; vigente: boolean };
  negocioTitulo: string | null;
  cuentaId: string | null;
  meta?: Record<string, unknown>;
  calculo: Record<string, unknown>;
  version: { editable: boolean; estado: string; validaHasta: string | null; numero: number };
  secciones: { id: string; nombre: string; lineas: { id: string; nombre: string; tipo: string; costo?: unknown }[] }[];
};

async function cargarFicha(id: string): Promise<DatosFicha> {
  const acceso = accesoCpq(await identidadActual());
  if (!acceso.leer) return { state: "forbidden", gestionar: false, aprobar: false, aprobarEnvios: false, ficha: null };
  const r = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
  if (!r.ok) {
    if (r.error.code === "NOT_FOUND") notFound();
    return { state: estadoPantalla(r), gestionar: false, aprobar: false, aprobarEnvios: false, ficha: null };
  }
  let ficha = r.data;
  if (acceso.crear && ficha.version.editable) {
    await ejecutarComoUsuario("erp", "cpq.cotizaciones.calcular", { id }, false);
    const r2 = await ejecutarComoUsuario<FichaRespuesta>("erp", "cpq.cotizaciones.ficha", { id });
    if (r2.ok) ficha = r2.data;
  }
  return { state: "ready", gestionar: acceso.crear, aprobar: acceso.aprobar, aprobarEnvios: acceso.aprobarEnvios, ficha };
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
