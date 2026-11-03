import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorCanalesDiferido } from "./editor-canales-diferido";
import type { CanalConfig } from "./editor-canales";

/**
 * Pestaña «Canales de entrada» de Configuración → Módulos → Comercial (Leads, diseño 07): estado de
 * los cuatro canales, clave y endpoint del formulario web (PR 2), y responsable por defecto.
 * Lee y escribe solo por capacidades.
 */
export async function SeccionCanales() {
  const r = await ejecutarComoUsuario<CanalConfig[]>("erp", "comercial.canales.get", {});
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? <EditorCanalesDiferido canales={r.data} /> : null}
    </Estado>
  );
}
