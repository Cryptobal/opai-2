import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { EstadoAsistencia } from "./tipos";

type Texto = { proposito: string; version: string; texto: string };

/** Estado de la propia persona (sesión de Trabajador) y los textos de consentimiento. */
export async function cargarAsistenciaPropia() {
  const [e, t] = await Promise.all([
    ejecutarComoUsuario<EstadoAsistencia>("trabajador", "asistencia.rostro.estado", {}),
    ejecutarComoUsuario<Texto[]>("trabajador", "asistencia.rostro.textos", {}),
  ]);
  const sinModulo = [e, t].some((r) => !r.ok && (r.error?.message?.includes("Módulo inactivo") || r.error?.code === "NOT_FOUND"));
  return {
    state: sinModulo ? ("empty" as const) : estadoPantalla(e, t),
    estado: e.ok ? e.data : null,
    textos: t.ok ? t.data : [],
  };
}

export const textoDe = (textos: Texto[], proposito: string) => textos.find((x) => x.proposito === proposito)?.texto ?? "";

export const TEXTOS_SIN_ASISTENCIA = {
  vacio: { titulo: "Asistencia no disponible", descripcion: "Tu empresa aún no tiene activada la marca de asistencia, o tu cuenta no tiene ficha de persona." },
} as const;
