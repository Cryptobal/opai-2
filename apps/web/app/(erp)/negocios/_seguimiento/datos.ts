import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type PasoSeguimiento = {
  id: string; orden: number; titulo: string; canal: "correo" | "whatsapp" | "llamada" | "interno";
  ejecutor: "persona" | "opai_automatico" | "agente"; estado: string; programadoEn: string;
  asunto: string | null; cuerpo: string | null; resultado: string | null; error: string | null; hechoEn: string | null;
};
export type VistaSeguimiento = {
  id: string; negocioId: string; planNombre: string; planVersion: number; estado: string; estadoVisible: string;
  motivo: string | null; ancla: string; cotizacionCodigo: string | null; pasos: PasoSeguimiento[]; proximoPasoId: string | null;
};
export type PlanOpcion = { id: string; nombre: string; porDefecto: boolean; activo: boolean; pasos: number };

/** Seguimiento del negocio (el último, vivo o no) y los planes que se pueden iniciar. */
export async function cargarSeguimientoDelNegocio(negocioId: string) {
  const [s, planes] = await Promise.all([
    ejecutarComoUsuario<VistaSeguimiento | null>("erp", "comercial.seguimientos.get", { negocioId }),
    ejecutarComoUsuario<{ id: string; nombre: string; porDefecto: boolean; activo: boolean; config: { pasos: unknown[] } }[]>(
      "erp", "comercial.seguimiento_planes.list", {},
    ),
  ]);
  return {
    state: estadoPantalla(s),
    seguimiento: s.ok ? s.data : null,
    planes: planes.ok ? planes.data.filter((p) => p.activo).map((p): PlanOpcion => ({ id: p.id, nombre: p.nombre, porDefecto: p.porDefecto, activo: p.activo, pasos: p.config.pasos.length })) : [],
  };
}

export async function cargarPendientes() {
  const r = await ejecutarComoUsuario<(VistaSeguimiento & { negocioTitulo: string })[]>("erp", "comercial.seguimientos.list", { soloPendientes: true, estado: "activo" });
  return { state: estadoPantalla(r), items: r.ok ? r.data : [] };
}
