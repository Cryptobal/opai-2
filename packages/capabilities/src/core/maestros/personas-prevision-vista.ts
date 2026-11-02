import { z } from "zod";

import { cifradoDeCampos } from "../cumplimiento/cifrado-campos";
import type { Contexto } from "../../types";
import { textoOpcional } from "./comun";
import {
  enmascararPlanIsapre,
  enmascararPlanIsapreEnLectura,
} from "./personas-ficha-comun";
import { uuidSchema } from "../esquemas";

export const previsionSchema = z.object({
  personaId: z.string(),
  afp: z.string().nullable(),
  regimen: z.string().nullable(),
  sistemaSalud: z.string().nullable(),
  isapreNombre: z.string().nullable(),
  planIsapre: z.string().nullable(),
  planUf: z.string().nullable(),
  cotizacionUfPct: z.string().nullable(),
});

export const inputPrevision = z.object({
  id: uuidSchema,
  afp: textoOpcional(80),
  regimen: textoOpcional(80),
  sistemaSalud: textoOpcional(40),
  isapreNombre: textoOpcional(120),
  planIsapre: textoOpcional(500),
  planUf: z.string().trim().max(20).nullable().optional(),
  cotizacionUfPct: z.string().trim().max(20).nullable().optional(),
});

export async function vistaPrevision(
  ctx: Contexto,
  fila: {
    personaId: string;
    afp: string | null;
    regimen: string | null;
    sistemaSalud: string | null;
    isapreNombre: string | null;
    planIsapre: string | null;
    planUf: { toString(): string } | null;
    cotizacionUfPct: { toString(): string } | null;
  } | null,
  personaId: string,
) {
  if (!fila) {
    return {
      personaId,
      afp: null,
      regimen: null,
      sistemaSalud: null,
      isapreNombre: null,
      planIsapre: null,
      planUf: null,
      cotizacionUfPct: null,
    };
  }
  const enmascarar = enmascararPlanIsapreEnLectura(ctx);
  let plan: string | null = null;
  if (fila.planIsapre) {
    if (enmascarar) {
      plan = enmascararPlanIsapre(fila.planIsapre);
    } else {
      plan = await cifradoDeCampos(ctx).descifrar(
        "personas_prevision",
        "plan_isapre",
        fila.planIsapre,
      );
    }
  }
  return {
    personaId: fila.personaId,
    afp: fila.afp ?? null,
    regimen: fila.regimen ?? null,
    sistemaSalud: fila.sistemaSalud ?? null,
    isapreNombre: fila.isapreNombre ?? null,
    planIsapre: plan,
    planUf: fila.planUf?.toString() ?? null,
    cotizacionUfPct: fila.cotizacionUfPct?.toString() ?? null,
  };
}
