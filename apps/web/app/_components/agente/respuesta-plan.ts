import { AVISO_SIN_HISTORIAL, ERROR_VENCIDO, textoError } from "./mensajes-error";
import {
  type Mensaje,
  type Nivel,
  type PlanVista,
  type Resolucion,
  type Turno,
  VIGENCIA_PLAN_MS,
} from "./tipos";

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

/** Aplica al mensaje del agente la respuesta de `agente.turno.preparar`: texto, plan y aviso de historial. */
export function aplicarTurno(m: Mensaje, t: Turno, nivel: Nivel): Mensaje {
  const plan: PlanVista | undefined = t.token
    ? {
        pasos: t.pasos,
        nivel,
        token: t.token,
        siguiente: 0,
        resultados: [],
        estado: "propuesto",
        // Margen de 30 s: el reloj del servidor corre desde antes de que llegue la respuesta.
        vence: Date.now() + VIGENCIA_PLAN_MS - 30_000,
      }
    : undefined;
  return {
    ...m,
    texto: t.texto,
    ...(plan ? { plan } : {}),
    ...(t.conversacionId ? {} : { aviso: AVISO_SIN_HISTORIAL }),
  };
}
