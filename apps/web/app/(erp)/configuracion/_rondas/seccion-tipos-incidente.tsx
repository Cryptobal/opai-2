import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { TipoIncidente } from "@/app/(erp)/instalaciones/_componentes/rondas/tipos";

import { EditorTiposIncidente } from "./editor-tipos-incidente";

/**
 * Pestaña «Tipos de incidente» de Configuración → Rondas (c15t, ADR-018): catálogo del tenant con
 * nombre, gravedad por defecto y activo/inactivo. El módulo no tiene página de configuración propia;
 * el núcleo monta esta pestaña junto a los ajustes del manifest. Lee y escribe solo por capacidades.
 */
export async function SeccionTiposIncidente() {
  const r = await ejecutarComoUsuario<TipoIncidente[]>("erp", "rondas.incidentes_tipo.listar", {
    incluirInactivos: true,
  });
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? <EditorTiposIncidente tipos={r.data} /> : null}
    </Estado>
  );
}
