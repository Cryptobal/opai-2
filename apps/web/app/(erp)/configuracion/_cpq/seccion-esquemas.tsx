import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { EsquemasEditable } from "./esquemas-editable";
import type { CicloTurno, EsquemaCobertura } from "./esquemas-tipos";

/** Sub-sección «Esquemas de cobertura» de la pestaña Catálogo del CPQ (CAR-212). */
export async function SeccionEsquemasCobertura() {
  const identidad = await identidadActual();
  const editable = identidad ? puedeDeIdentidad(identidad)("cpq:modelo.manage") : false;
  const [r, p] = await Promise.all([
    ejecutarComoUsuario<{ items: EsquemaCobertura[] }>("erp", "cpq.esquemas_cobertura.list", { incluirInactivos: true }),
    ejecutarComoUsuario<CicloTurno[]>("erp", "core.patrones.list", {}),
  ]);
  if (!r.ok) return <p role="alert" className="t-body-sm text-danger-fg">No pudimos cargar los esquemas de cobertura. Reintenta en un momento.</p>;
  const ciclos = p.ok ? p.data.map(({ id, nombre, resumen }) => ({ id, nombre, resumen })) : [];
  return <EsquemasEditable esquemas={r.data.items} ciclos={ciclos} editable={editable} />;
}
