import { ERROR_VENCIDO, textoError } from "./mensajes-error";
import type { Mensaje, PlanVista, Resolucion } from "./tipos";

type Respuesta =
  { ok: true; data: unknown } | { ok: false; error: { code: string; message: string } };

/** Aplica al mensaje la respuesta de `agente.plan.confirmar` (o su error) sobre el plan visible. */
export function aplicarRespuesta(m: Mensaje, r: Respuesta, previo: PlanVista["estado"]): Mensaje {
  if (!m.plan) return m;
  if (!r.ok) {
    const vencido = r.error.code === "FORBIDDEN";
    const error = vencido ? ERROR_VENCIDO : textoError(r.error.code, r.error.message, true);
    return { ...m, plan: { ...m.plan, estado: vencido ? "vencido" : previo, error } };
  }
  const res = r.data as Resolucion;
  const resultados = [...m.plan.resultados, ...res.resultados];
  const hechos = resultados.filter((x) => x.ok).length;
  const estado = res.estado === "pendiente" ? "en_curso" : res.estado;
  return {
    ...m,
    plan: {
      ...m.plan,
      token: res.siguiente,
      resultados,
      siguiente: hechos,
      estado: estado === "prevista" ? "propuesto" : estado,
    },
  };
}
