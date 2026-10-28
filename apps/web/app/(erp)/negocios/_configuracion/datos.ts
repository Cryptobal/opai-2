import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { ConfigComercial } from "../_componentes/hojas/tipos";

/** Embudo y catálogos de Comercial para Configuración → Módulos → Comercial. */
export async function cargarConfigComercial() {
  const r = await ejecutarComoUsuario<ConfigComercial>("erp", "comercial.config.get", {});
  return { state: estadoPantalla(r), config: r.ok ? r.data : null };
}
