import { z } from "zod";

import { hechoPlausible } from "@opai/domain";

import { uuidSchema } from "../esquemas";
import { fechaHora } from "./hechos-comun";
import { TIPOS_HECHO_TERRENO, tipoPermitido } from "./hechos-tipos";

export const hechoEntrada = z.object({
  clave: uuidSchema,
  tipo: z.string().min(1).max(80),
  payload: z.unknown(),
  personaId: uuidSchema.nullish(),
  horaHecho: fechaHora,
});
export type HechoEntrada = z.infer<typeof hechoEntrada>;

export const MOTIVOS_RECHAZO = [
  "tipo_no_permitido",
  "payload_invalido",
  "posterior_al_envio",
  "muy_antiguo",
  "persona_no_valida",
  "qr_invalido",
  "qr_ajeno",
  "documento_invalido",
  "patente_invalida",
  "modulo_inactivo",
  "entrada_desconocida",
  "salida_repetida",
  "plantilla_invalida",
  "ronda_no_permitida",
  "ejecucion_desconocida",
  "ronda_ya_cerrada",
  "punto_invalido",
  "tipo_incidente_invalido",
] as const;
export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number];
type Motivo = MotivoRechazo;

export const resultadoHecho = z.object({
  clave: z.string(),
  estado: z.enum(["recibido", "duplicado", "rechazado"]),
  motivo: z.enum(MOTIVOS_RECHAZO).nullable(),
});
export type ResultadoHecho = z.infer<typeof resultadoHecho>;

/** Decide, hecho por hecho y sin escribir, cuáles se reciben, cuáles ya estaban y cuáles se rechazan. */
export function evaluarLote(p: {
  hechos: readonly HechoEntrada[];
  envio: Date;
  yaGuardadas: ReadonlySet<string>;
  personasValidas: ReadonlySet<string>;
  /** Hechos de módulos (marca de ronda, acceso) que el servidor no pudo resolver; ver `proyecciones.ts`. */
  proyeccionesRechazadas?: ReadonlyMap<string, MotivoRechazo>;
}): { resultados: ResultadoHecho[]; nuevos: HechoEntrada[] } {
  const nuevos: HechoEntrada[] = [];
  const vistas = new Set<string>();
  const resultados = p.hechos.map((h): ResultadoHecho => {
    const r = (estado: ResultadoHecho["estado"], motivo: Motivo | null = null) => ({
      clave: h.clave,
      estado,
      motivo,
    });
    if (p.yaGuardadas.has(h.clave) || vistas.has(h.clave)) return r("duplicado");
    if (!tipoPermitido(h.tipo)) return r("rechazado", "tipo_no_permitido");
    if (!TIPOS_HECHO_TERRENO[h.tipo].safeParse(h.payload).success)
      return r("rechazado", "payload_invalido");
    const plausible = hechoPlausible(new Date(h.horaHecho), p.envio);
    if (!plausible.ok) return r("rechazado", plausible.motivo);
    if (h.personaId && !p.personasValidas.has(h.personaId))
      return r("rechazado", "persona_no_valida");
    const motivoMarca = p.proyeccionesRechazadas?.get(h.clave);
    if (motivoMarca) return r("rechazado", motivoMarca);
    vistas.add(h.clave);
    nuevos.push(h);
    return r("recibido");
  });
  return { resultados, nuevos };
}
