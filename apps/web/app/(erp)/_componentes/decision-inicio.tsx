import { ejecutarComoUsuario } from "@/lib/servidor";

import { esFalloReal, FalloBloque } from "./fallo-bloque";
import { type Pendiente, PendientesInicio } from "./pendientes-inicio";

/** «Requiere tu decisión hoy»: sin el permiso el bloque no aparece; un fallo se ve como error con
 *  «Reintentar», nunca como «nada pendiente» (CAR-50), y no tumba a los demás bloques. */
export async function DecisionInicio() {
  const r = await ejecutarComoUsuario<Pendiente[]>("erp", "core.inicio.pendientes", {});
  if (r.ok) return <PendientesInicio items={r.data} />;
  return esFalloReal(r.error.code) ? (
    <FalloBloque titulo="No pudimos cargar tus pendientes" />
  ) : null;
}
