import { Badge, Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Centro } from "@/app/(erp)/finanzas/_componentes/tipos";

/**
 * Pestaña «Centros de costo» de Configuración › Módulos › Finanzas (ADR-018). Los centros son las
 * instalaciones más «Administración / Oficina central» (decisión de Carlos, 30-oct-2026): no se
 * crean aquí, salen de Instalaciones.
 */
export async function SeccionCentrosCosto() {
  const r = await ejecutarComoUsuario<Centro[]>("erp", "finanzas.centros_costo.listar", {});
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      <div className="flex flex-col gap-4">
        <p className="text-base text-fg-muted">
          Los centros de costo son tus instalaciones y uno general. Para agregar uno, crea la instalación.
        </p>
        <ul className="rounded-lg border border-border bg-surface">
          {(r.ok ? r.data : []).map((c) => (
            <li key={c.instalacionId ?? "general"} className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
              <span>{c.nombre}</span>
              <Badge tono={c.tipo === "general" ? "accent" : "neutro"}>{c.tipo === "general" ? "General" : "Instalación"}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Estado>
  );
}
