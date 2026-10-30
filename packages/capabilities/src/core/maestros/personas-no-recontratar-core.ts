import { z } from "zod";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { iso } from "../comun";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";
import { dondePersona } from "./alcance";
import { aFecha, dia, escribirConEvento } from "./comun";

export const marcaNoRecontratarSchema = z.object({
  personaId: z.string(),
  activa: z.boolean(),
  motivo: z.string().nullable(),
  marcadaEn: z.string().nullable(),
  venceEn: z.string().nullable(),
});

type FilaMarca = {
  id: string;
  noRecontratar?: boolean | null;
  noRecontratarMotivo?: string | null;
  noRecontratarEn?: Date | null;
  noRecontratarVenceEn?: Date | null;
};

export function vista(p: FilaMarca) {
  return {
    personaId: p.id,
    activa: p.noRecontratar ?? false,
    motivo: p.noRecontratarMotivo ?? null,
    marcadaEn: iso(p.noRecontratarEn ?? null),
    venceEn: dia(p.noRecontratarVenceEn ?? null),
  };
}

/** Solo trae las columnas de la marca: la vista general de personas (personaDe) no las expone. */
export async function personaParaMarca(ctx: Contexto, id: string) {
  const p = await ctx.db.persona.findFirst({
    where: { id, AND: [dondePersona(ctx)] },
    select: {
      id: true,
      anonimizadaEn: true,
      noRecontratar: true,
      noRecontratarMotivo: true,
      noRecontratarEn: true,
      noRecontratarVenceEn: true,
    },
  });
  if (!p) throw noEncontrado("La persona");
  return p;
}

const SELECT_MARCA = {
  id: true,
  noRecontratar: true,
  noRecontratarMotivo: true,
  noRecontratarEn: true,
  noRecontratarVenceEn: true,
} as const;

export async function cambiar(
  ctx: Contexto,
  id: string,
  dryRun: boolean,
  tipo: string,
  activa: boolean,
  motivoTexto: string,
  venceEnTexto: string | null,
) {
  const actual = await personaParaMarca(ctx, id);
  exigirNoAnonimizado(actual, "La persona");
  const data = {
    noRecontratar: activa,
    noRecontratarMotivo: activa ? motivoTexto : null,
    noRecontratarEn: activa ? new Date() : null,
    noRecontratarVenceEn: activa && venceEnTexto ? aFecha(venceEnTexto) : null,
  };
  if (dryRun) return vista({ ...actual, ...data });
  const p = await escribirConEvento(
    ctx,
    // El motivo queda marcado `sensibles` en la capacidad (ver `eventoAuditoria`): nunca en claro en
    // Actividad ni en `core.audit.list`, ni para quien tiene el permiso (así el motivo anterior no
    // sobrevive a un "Quitar", correcciones del Revisor y del abogado del 30-oct 15:33 CLT). El evento va
    // sin payload: core.eventos lo guarda en claro y sobrevive a Quitar, al vencimiento y a la anonimización.
    { tipo, entidadTipo: "persona", payload: () => ({}) },
    async (tx) => {
      await bloquearNoAnonimizado(tx, "persona", id);
      return tx.persona.update({ where: { id }, data, select: SELECT_MARCA });
    },
  );
  return vista(p);
}
