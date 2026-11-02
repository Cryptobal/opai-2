import type { Contexto } from "../../types";

import { fechaCivil } from "./comun";

type PublicarInput = {
  indicadorId: string;
  valorJson: number;
  vigenteDesde: string;
  fuente: string;
  consultadaEl: string;
};

function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Publica un valor de plataforma en `core.valores_publicados` si cambió respecto al vigente. */
export async function publicarValorPlataforma(
  ctx: Contexto,
  input: PublicarInput,
): Promise<{ publicadoId: string | null; cambio: boolean }> {
  const vigenteDesde = new Date(`${input.vigenteDesde}T12:00:00.000Z`);
  const consultadaEl = new Date(`${input.consultadaEl}T12:00:00.000Z`);
  const actual = await ctx.db.valorPublicado.findFirst({
    where: { indicadorId: input.indicadorId, estado: "vigente" },
    orderBy: { vigenteDesde: "desc" },
  });
  if (
    actual &&
    Number(actual.valorJson) === input.valorJson &&
    fechaCivil(actual.vigenteDesde) === input.vigenteDesde
  ) {
    return { publicadoId: actual.id, cambio: false };
  }

  const id = await ctx.transaccion(async (tx) => {
    if (actual && fechaCivil(actual.vigenteDesde) < input.vigenteDesde) {
      await tx.valorPublicado.update({
        where: { id: actual.id },
        data: { vigenteHasta: new Date(`${diaAnterior(input.vigenteDesde)}T12:00:00.000Z`) },
      });
    } else if (actual && fechaCivil(actual.vigenteDesde) === input.vigenteDesde) {
      await tx.valorPublicado.update({
        where: { id: actual.id },
        data: {
          valorJson: input.valorJson,
          fuente: input.fuente,
          consultadaEl,
          verificacion: "verificado",
          vigenteHasta: null,
        },
      });
      return actual.id;
    }
    const creado = await tx.valorPublicado.create({
      data: {
        indicadorId: input.indicadorId,
        valorJson: input.valorJson,
        vigenteDesde,
        estado: "vigente",
        fuente: input.fuente,
        consultadaEl,
        verificacion: "verificado",
      },
    });
    return creado.id;
  });
  return { publicadoId: id, cambio: true };
}
