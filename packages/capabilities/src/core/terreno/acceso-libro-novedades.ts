import type { Contexto } from "../../types";

type IntentoLibro = {
  clave: string;
  motivo: string;
  tipoRegistro: string;
  personaId: string | null;
  horaCorregida: Date;
};

const ETIQUETA_MOTIVO: Record<string, string> = {
  bloqueado: "lista bloqueada",
  fuera_de_lista: "fuera de lista",
  fuera_de_horario: "fuera de horario",
  uso_unico_consumido: "uso único ya consumido",
};

const resumenDenegado = (tipoRegistro: string, motivo: string) => {
  const cat = ETIQUETA_MOTIVO[motivo] ?? motivo.replaceAll("_", " ");
  return `Entrada denegada (${tipoRegistro}): ${cat}`;
};

/** CAR-522: intentos denegados de portería en el libro de novedades del núcleo, sin datos del visitante. */
export async function registrarIntentosEnLibro(
  tx: Contexto["db"],
  ctx: Contexto,
  equipo: { id: string; instalacionId: string },
  intentos: readonly IntentoLibro[],
) {
  if (intentos.length === 0) return;
  const nuevas = await tx.libroNovedad.createManyAndReturn({
    skipDuplicates: true,
    data: intentos.map((i) => ({
      tenantId: ctx.tenantId,
      instalacionId: equipo.instalacionId,
      modulo: "acceso",
      origen: "acceso",
      gravedad: i.motivo === "bloqueado" ? "alta" : "media",
      resumen: resumenDenegado(i.tipoRegistro, i.motivo),
      dispositivoId: equipo.id,
      personaId: i.personaId,
      horaHecho: i.horaCorregida,
      idempotencyKey: i.clave,
    })),
    select: { id: true, numero: true, gravedad: true, instalacionId: true },
  });
  for (const n of nuevas) {
    await ctx.eventos.emitir(tx, {
      tipo: "core.libro_novedades.registrada",
      entidadTipo: "libro_novedad",
      entidadId: n.id,
      payload: { instalacionId: n.instalacionId, numero: n.numero, gravedad: n.gravedad },
    });
  }
}