import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { TipoTicket } from "@/app/(erp)/tickets/_componentes/datos";

import { EditorTipos } from "./editor-tipos";

/**
 * Pestaña «Tipos» de Configuración → Módulos → Tickets (ADR-018): catálogo del tenant con dueño por
 * defecto, aprobación, SLA opcional y activo/inactivo. Lee y escribe solo por capacidades.
 */
export async function SeccionTiposTicket() {
  const r = await ejecutarComoUsuario<TipoTicket[]>("erp", "tickets.tipos.listar", {
    incluirInactivos: true,
  });
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? <EditorTipos tipos={r.data} /> : null}
    </Estado>
  );
}
