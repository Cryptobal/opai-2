// Interfaz de verificación de identidad (D-02). La marca real se conecta a «Operaciones · Base»
// (ingreso RUT + PIN y adaptador de biometría) sin tocar sus archivos; aquí solo vive el contrato y
// una implementación simulada con PIN para las pruebas y la empresa de prueba.

import type { Metodo } from "./tipos";

export type SolicitudIdentidad = {
  personaId: string;
  metodo: Metodo;
  /** PIN o secreto del método; nunca se guarda ni se registra. */
  credencial?: string | undefined;
  /** Si cae al respaldo, por qué (proveedor caído, rostro no reconocido…). */
  motivoRespaldo?: string | undefined;
  /** Muestra del rostro con su prueba de vida (la entrega la cámara); obligatoria con el método rostro (D-03). */
  muestra?: string | undefined;
};

export type ResultadoIdentidad =
  | {
      ok: true;
      metodo: Metodo;
      motivoRespaldo: string | null;
      /** Similitud 0–1; nula si no hubo rostro. */
      confianza: number | null;
      /** Resultado de la prueba de vida; nulo si no aplica (con PIN). */
      pruebaVida: boolean | null;
    }
  | {
      ok: false;
      motivo:
        | "credencial_invalida"
        | "metodo_no_disponible"
        | "bloqueado"
        | "rostro_no_coincide"
        | "vida_fallida"
        | "sin_enrolamiento"
        | "proveedor_caido";
    };

export interface VerificadorIdentidad {
  verificar(s: SolicitudIdentidad): Promise<ResultadoIdentidad>;
}

/** Verificador de prueba: acepta un PIN fijo por persona. Nunca se usa con marcas reales. */
export function verificadorPinSimulado(pines: ReadonlyMap<string, string>): VerificadorIdentidad {
  return {
    async verificar(s) {
      if (s.metodo === "rostro" || s.metodo === "manual_contingencia")
        return { ok: false, motivo: "metodo_no_disponible" };
      if (!s.credencial || pines.get(s.personaId) !== s.credencial)
        return { ok: false, motivo: "credencial_invalida" };
      return { ok: true, metodo: s.metodo, motivoRespaldo: s.motivoRespaldo ?? null, confianza: null, pruebaVida: null };
    },
  };
}
