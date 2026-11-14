import type { TenantTx } from "@opai/db";

import type { z } from "zod";
import { aFecha } from "./comun";
import type { actualizarLaboralInput } from "./personas-laboral-input";

type InputLaboral = z.infer<typeof actualizarLaboralInput> & { id: string };

/** Copia solo las claves enviadas (`undefined` = no se toca); las fechas pasan a Date. */
function patchDe<T extends object>(
  origen: T,
  claves: readonly (keyof T & string)[],
  fechas: readonly (keyof T & string)[] = [],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of claves) {
    const v = origen[k] as unknown;
    if (v === undefined) continue;
    patch[k] = fechas.includes(k) && typeof v === "string" ? aFecha(v) : v;
  }
  return patch;
}

const UNIFORME = ["estaturaCm", "pesoKg", "notas"] as const;
const JORNADA = [
  "resolucion",
  "resolucionVigenteDesde",
  "resolucionVigenteHasta",
  "horasSemanales",
  "distribucion",
  "articulo22",
  "avisoTerminoDias",
] as const;
const JORNADA_FECHAS = ["resolucionVigenteDesde", "resolucionVigenteHasta"] as const;
const CONTACTO = [
  "estadoCivil",
  "telefonoSecundario",
  "emergenciaNombre",
  "emergenciaRelacion",
  "emergenciaTelefono",
  "codigoInterno",
  "movilizacion",
] as const;

/** Talla por prenda (CAR-408): vacía o null borra la fila; si no, la crea o la cambia. */
async function guardarTallas(
  tx: TenantTx,
  base: { tenantId: string; personaId: string },
  tallas: Record<string, string | null>,
) {
  for (const [prenda, valor] of Object.entries(tallas)) {
    const talla = valor?.trim() ?? "";
    if (!talla) {
      await tx.personaTalla.deleteMany({ where: { personaId: base.personaId, prenda } });
      continue;
    }
    await tx.personaTalla.upsert({
      where: { personaId_prenda: { personaId: base.personaId, prenda } },
      create: { ...base, prenda, talla },
      update: { talla },
    });
  }
}

/** Aplica solo los campos enviados (actualización parcial por sección). */
export async function aplicarLaboralParcial(
  tx: TenantTx,
  p: { id: string; tenantId: string },
  input: InputLaboral,
): Promise<void> {
  const base = { tenantId: p.tenantId, personaId: p.id };
  if (input.uniforme) {
    const { entrega, tallas, ...datos } = input.uniforme;
    if (tallas) await guardarTallas(tx, base, tallas);
    const patch = patchDe(datos, UNIFORME);
    let u = await tx.personaUniforme.findUnique({ where: { personaId: p.id } });
    if (Object.keys(patch).length || (entrega && !u)) {
      u = await tx.personaUniforme.upsert({
        where: { personaId: p.id },
        create: { ...base, ...patch },
        update: patch,
      });
    }
    if (entrega && u) {
      await tx.personaUniformeEntrega.create({
        data: {
          ...base,
          uniformeId: u.id,
          entregadaEn: aFecha(entrega.entregadaEn),
          articulo: entrega.articulo,
          talla: entrega.talla ?? null,
          cantidad: entrega.cantidad,
          notas: entrega.notas ?? null,
        },
      });
    }
  }
  if (input.jornadaDt) {
    // Los períodos del contrato se registran aparte, como historia (CAR-409).
    const patch = patchDe(input.jornadaDt, JORNADA, JORNADA_FECHAS);
    if (Object.keys(patch).length) {
      await tx.personaJornadaDt.upsert({
        where: { personaId: p.id },
        create: { ...base, ...patch },
        update: patch,
      });
    }
  }
  if (input.os10) {
    const patch = patchDe(input.os10, ["credencial", "venceEn"] as const, ["venceEn"] as const);
    if (Object.keys(patch).length) {
      await tx.personaOs10.upsert({
        where: { personaId: p.id },
        create: { ...base, ...patch },
        update: patch,
      });
    }
  }
  if (input.contacto) {
    const patch = patchDe(input.contacto, CONTACTO);
    if (Object.keys(patch).length) {
      await tx.personaContactoLaboral.upsert({
        where: { personaId: p.id },
        create: { ...base, ...patch },
        update: patch,
      });
    }
  }
}
