import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { CostosPredefinidosDiferido } from "./costos-predefinidos-diferido";
import type { ItemPredefinido } from "./costos-predefinidos-editable";

/** Sub-sección «Costos predefinidos» de la pestaña Catálogo del CPQ (CAR-213); se ve con `cpq:costos.ver`. */
export async function SeccionCostosPredefinidos() {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede("cpq:costos.ver")) return null;
  const r = await ejecutarComoUsuario<{ items: ItemPredefinido[]; categorias: { id: string; nombre: string }[] }>("erp", "cpq.costos_predefinidos.list", {});
  if (!r.ok) return <p role="alert" className="t-body-sm text-danger-fg">No pudimos cargar los costos predefinidos. Reintenta en un momento.</p>;
  return <CostosPredefinidosDiferido items={r.data.items} categorias={r.data.categorias} editable={puede("cpq:modelo.manage")} />;
}
