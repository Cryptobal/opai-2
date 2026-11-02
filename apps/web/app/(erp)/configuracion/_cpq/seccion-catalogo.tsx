import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

type ItemCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  costoUnitarioClp: number;
  recurrencia: string;
  activo: boolean;
};

/** Pestaña Catálogo de Configuración → Módulos → CPQ. */
export async function SeccionCatalogoCpq() {
  const r = await ejecutarComoUsuario<{ items: ItemCatalogo[] }>("erp", "cpq.catalogo_items.list", {
    incluirInactivos: true,
  });
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? (
        <div className="space-y-3">
          <p className="t-body-sm text-fg-muted">
            Ítems del catálogo CPQ del tenant (costo unitario y recurrencia por defecto).
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {r.data.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                <span className="t-body-sm">
                  <span className="t-mono text-fg-muted">{i.codigo}</span> · {i.nombre}
                </span>
                <span className="t-caption text-fg-muted">
                  {i.costoUnitarioClp.toLocaleString("es-CL")} CLP · {i.recurrencia}
                  {!i.activo ? " · inactivo" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Estado>
  );
}
