import { z } from "zod";

import { cifradoDeCampos } from "../cumplimiento/cifrado-campos";
import type { Contexto } from "../../types";
import { enmascararPlanIsapre, enmascararPlanIsapreEnLectura } from "./personas-ficha-comun";

export { inputPrevision } from "./personas-prevision-input";

const d = () => z.string().nullable();

export const previsionSchema = z.object({
  personaId: z.string(),
  afp: z.string().nullable(),
  regimen: z.string().nullable(),
  sistemaSalud: z.string().nullable(),
  isapreNombre: z.string().nullable(),
  planIsapre: z.string().nullable(),
  planUf: d(),
  cotizacionUfPct: d(),
  jubilado: z.boolean(),
  cotizaAfp: z.boolean(),
  cotizaAfc: z.boolean(),
  cotizaSalud: z.boolean(),
  /** Los siguientes van en null cuando el lector no gestiona la previsión (ver `sensiblesOcultos`). */
  tipoPension: z.string().nullable(),
  saludAdicionalPct: d(),
  apvInstitucion: z.string().nullable(),
  apvRegimen: z.string().nullable(),
  apvMonto: d(),
  apvMoneda: z.string().nullable(),
  tramoAsignacion: z.string().nullable(),
  cargasSimples: z.number().int().nullable(),
  cargasMaternales: z.number().int().nullable(),
  cargasInvalidez: z.number().int().nullable(),
  discapacidadInvalidez: z.string().nullable(),
  /** True si el lector recibe los datos sensibles ocultos (supervisor sin permiso de gestión, R-PER-004). */
  sensiblesOcultos: z.boolean(),
});
export type VistaPrevision = z.infer<typeof previsionSchema>;

type Dec = { toString(): string } | null;
type Fila = {
  personaId: string;
  afp: string | null;
  regimen: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  planIsapre: string | null;
  planUf: Dec;
  cotizacionUfPct: Dec;
  jubilado?: boolean;
  tipoPension?: string | null;
  saludAdicionalPct?: Dec;
  cotizaAfp?: boolean;
  cotizaAfc?: boolean;
  cotizaSalud?: boolean;
  apvInstitucion?: string | null;
  apvRegimen?: string | null;
  apvMonto?: Dec;
  apvMoneda?: string | null;
  tramoAsignacion?: string | null;
  cargasSimples?: number;
  cargasMaternales?: number;
  cargasInvalidez?: number;
  discapacidadInvalidez?: string | null;
};

const txt = (v: Dec | undefined) => (v == null ? null : v.toString());

export async function vistaPrevision(
  ctx: Contexto,
  fila: Fila | null,
  personaId: string,
): Promise<VistaPrevision> {
  const ocultar = enmascararPlanIsapreEnLectura(ctx);
  let plan: string | null = null;
  if (fila?.planIsapre) {
    plan = ocultar
      ? enmascararPlanIsapre(fila.planIsapre)
      : await cifradoDeCampos(ctx).descifrar("personas_prevision", "plan_isapre", fila.planIsapre);
  }
  const s = <T>(v: T) => (ocultar ? null : v);
  // Tipo de pensión y discapacidad van cifrados (CAR-411): se descifran solo para quien ve los datos sensibles.
  const salud = async (
    col: "tipo_pension" | "discapacidad_invalidez",
    v: string | null | undefined,
  ) => (ocultar || !v ? null : cifradoDeCampos(ctx).descifrar("personas_prevision", col, v));
  return {
    personaId,
    afp: fila?.afp ?? null,
    regimen: fila?.regimen ?? null,
    sistemaSalud: fila?.sistemaSalud ?? null,
    isapreNombre: fila?.isapreNombre ?? null,
    planIsapre: plan,
    planUf: txt(fila?.planUf),
    cotizacionUfPct: txt(fila?.cotizacionUfPct),
    jubilado: fila?.jubilado ?? false,
    tipoPension: await salud("tipo_pension", fila?.tipoPension),
    cotizaAfp: fila?.cotizaAfp ?? true,
    cotizaAfc: fila?.cotizaAfc ?? true,
    cotizaSalud: fila?.cotizaSalud ?? true,
    saludAdicionalPct: s(txt(fila?.saludAdicionalPct)),
    apvInstitucion: s(fila?.apvInstitucion ?? null),
    apvRegimen: s(fila?.apvRegimen ?? null),
    apvMonto: s(txt(fila?.apvMonto)),
    apvMoneda: s(fila?.apvMoneda ?? null),
    tramoAsignacion: s(fila?.tramoAsignacion ?? null),
    cargasSimples: s(fila?.cargasSimples ?? 0),
    cargasMaternales: s(fila?.cargasMaternales ?? 0),
    cargasInvalidez: s(fila?.cargasInvalidez ?? 0),
    discapacidadInvalidez: await salud("discapacidad_invalidez", fila?.discapacidadInvalidez),
    sensiblesOcultos: ocultar,
  };
}
