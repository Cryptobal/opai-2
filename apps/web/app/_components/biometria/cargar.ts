import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { EstadoBiometria, TextoConsentimientoVista } from "./tipos";

/** Estado de la propia persona y los textos de consentimiento para las pantallas de marcación. */
export async function cargarMiBiometria(portal: "terreno" | "trabajador") {
  const [e, t] = await Promise.all([
    ejecutarComoUsuario<EstadoBiometria>(portal, "asistencia.biometria.mi_estado", {}),
    ejecutarComoUsuario<TextoConsentimientoVista[]>(portal, "asistencia.consentimientos.textos", {}),
  ]);
  const sinModulo = [e, t].some((r) => !r.ok && r.error?.message?.includes("Módulo inactivo"));
  return {
    state: sinModulo || [e, t].some((r) => !r.ok && r.error?.code === "NOT_FOUND") ? ("empty" as const) : estadoPantalla(e, t),
    estado: e.ok ? e.data : null,
    textos: t.ok ? t.data : [],
  };
}

export const textoDe = (textos: TextoConsentimientoVista[], tipo: TextoConsentimientoVista["tipo"]) =>
  textos.find((x) => x.tipo === tipo)?.texto ?? "";

export const TEXTOS_SIN_MARCAS = {
  vacio: { titulo: "Asistencia no disponible", descripcion: "Tu empresa aún no tiene activada la marca de asistencia, o tu cuenta no tiene ficha de persona." },
} as const;
