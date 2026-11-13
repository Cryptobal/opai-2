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

const UNIFORME = [
  "tallaCamisa", "tallaPantalon", "tallaChaqueta", "tallaZapato",
  "tallaPolera", "tallaGeologo", "tallaPolar", "estaturaCm", "pesoKg", "notas",
] as const;
const JORNADA = [
  "resolucion", "resolucionVigenteDesde", "resolucionVigenteHasta", "horasSemanales",
  "distribucion", "articulo22", "plazoFijoPeriodo", "terminoPlazoFijo", "avisoTerminoDias",
] as const;
const JORNADA_FECHAS = ["resolucionVigenteDesde", "resolucionVigenteHasta", "terminoPlazoFijo"] as const;
const CONTACTO = [
  "estadoCivil", "telefonoSecundario", "emergenciaNombre", "emergenciaRelacion",
  "emergenciaTelefono", "codigoInterno", "movilizacion",
] as const;

/** Aplica solo los campos enviados (actualización parcial por sección). */
export async function aplicarLaboralParcial(
  tx: TenantTx,
  p: { id: string; tenantId: string },
  input: InputLaboral,
): Promise<void> {
  const base = { tenantId: p.tenantId, personaId: p.id };
  if (input.uniforme) {
    const { entrega, ...datos } = input.uniforme;
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
    const j = input.jornadaDt;
    const patch = patchDe(j, JORNADA, JORNADA_FECHAS);
    if (j.terminosPlazoFijo !== undefined) {
      const terminos = [...j.terminosPlazoFijo].sort();
      patch["terminosPlazoFijo"] = terminos.map(aFecha);
      // El término vigente es el del último período registrado (compatibilidad con los avisos).
      const ultimo = terminos.at(-1);
      if (j.terminoPlazoFijo === undefined) patch["terminoPlazoFijo"] = ultimo ? aFecha(ultimo) : null;
      if (j.plazoFijoPeriodo === undefined) patch["plazoFijoPeriodo"] = terminos.length || null;
    }
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
