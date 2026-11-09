import {
  errorContinuidad,
  proveedorIa,
  type ContinuidadIa,
  type ProveedorIa,
  type RespuestaConversacion,
  type SolicitudConversacion,
} from "@opai/integrations";
import type { Candidato } from "./ia-respaldo";

/** Instancias y referencias privadas por iaDe: nunca se comparte cuenta, endpoint ni tenant. */
export function adaptadoresDelTurno(cands: readonly Candidato[]) {
  const adaptadores = new Map<Candidato, ProveedorIa>();
  const propietarios = new WeakMap<ContinuidadIa, Candidato>();
  return {
    de(c: Candidato) {
      let p = adaptadores.get(c);
      if (!p) {
        p = proveedorIa(
          c.id,
          c.cred.valor,
          c.baseUrl !== undefined ? { baseUrl: c.baseUrl } : undefined,
        );
        adaptadores.set(c, p);
      }
      return p;
    },
    registrar(c: Candidato, r: RespuestaConversacion) {
      if (r.continuidad) {
        propietarios.set(r.continuidad, c);
      }
    },
    cadena(s: SolicitudConversacion): readonly Candidato[] {
      let propietario: Candidato | undefined;
      for (const m of s.mensajes) {
        if (m.rol !== "asistente") continue;
        if (m.continuidad === undefined) continue;
        const c = propietarios.get(m.continuidad);
        if (!c || (propietario && propietario !== c)) throw errorContinuidad();
        propietario = c;
      }
      if (!propietario) for (const [c, p] of adaptadores) p.validarContinuacion?.(c.modelo, s);
      // Una continuación pertenece a esa cuenta; no puede enviarse a un respaldo, ni ante 5xx.
      return propietario ? [propietario] : cands;
    },
  };
}
