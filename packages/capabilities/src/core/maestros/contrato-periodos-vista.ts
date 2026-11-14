import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { dia } from "./comun";

/** Máximo de períodos de plazo fijo antes del indefinido (parámetro de 1.0: períodos 1–3). */
export const MAX_PERIODOS_PLAZO_FIJO = 3;

export const periodoSchema = z.object({
  id: z.string(),
  tipo: z.enum(["plazo_fijo", "indefinido"]),
  /** N.º del período de plazo fijo (1 a 3); nulo en el indefinido. */
  numero: z.number().nullable(),
  inicio: z.string(),
  termino: z.string().nullable(),
  registradoPorId: z.string().nullable(),
  registradoEn: z.string(),
});

/** Historia del contrato vigente y su estado actual, calculado desde la historia (CAR-409). */
export const contratoSchema = z.object({
  vinculoId: z.string(),
  /** Inicio del contrato vigente. */
  inicioContrato: z.string(),
  /** Tipo actual del contrato (sigue a la historia; un indefinido sin historia es de antes de CAR-409). */
  tipoContrato: z.string(),
  periodos: z.array(periodoSchema),
  /** N.º del período de plazo fijo vigente; nulo si no hay o si ya es indefinido. */
  periodoVigente: z.number().nullable(),
  /** Término del período de plazo fijo vigente: la fecha de los avisos de vencimiento. */
  terminoVigente: z.string().nullable(),
  indefinidoDesde: z.string().nullable(),
});

export type Periodo = z.infer<typeof periodoSchema>;
export type Contrato = z.infer<typeof contratoSchema>;

type FilaPeriodo = {
  id: string;
  tipo: string;
  inicio: Date;
  termino: Date | null;
  registradoPorId: string | null;
  createdAt: Date;
};

/** Calcula numeración y estado actual desde los períodos válidos (sin anular), en orden de inicio. */
export function calcularContrato(
  vinculo: { id: string; inicio: Date; tipo: string },
  filas: readonly FilaPeriodo[],
): Contrato {
  const orden = [...filas].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  let n = 0;
  const periodos: Periodo[] = orden.map((f) => {
    const plazo = f.tipo === "plazo_fijo";
    if (plazo) n += 1;
    return {
      id: f.id,
      tipo: plazo ? "plazo_fijo" : "indefinido",
      numero: plazo ? n : null,
      inicio: dia(f.inicio)!,
      termino: dia(f.termino),
      registradoPorId: f.registradoPorId,
      registradoEn: f.createdAt.toISOString(),
    };
  });
  const ultimo = periodos.at(-1);
  const indefinido = ultimo?.tipo === "indefinido";
  return {
    vinculoId: vinculo.id,
    inicioContrato: dia(vinculo.inicio)!,
    tipoContrato: vinculo.tipo,
    periodos,
    periodoVigente: ultimo && !indefinido ? ultimo.numero : null,
    terminoVigente: ultimo && !indefinido ? ultimo.termino : null,
    indefinidoDesde: indefinido ? ultimo.inicio : null,
  };
}

/** Vínculo vigente de la persona (el contrato al que se cuelga la historia), o nulo. */
export function vinculoVigente(db: TenantTx, personaId: string) {
  return db.vinculoLaboral.findFirst({
    where: { personaId, estado: "vigente" },
    select: { id: true, tipo: true, inicio: true },
  });
}

export function periodosValidos(db: TenantTx, vinculoId: string) {
  return db.contratoPeriodo.findMany({
    where: { vinculoId, anuladoEn: null },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      tipo: true,
      inicio: true,
      termino: true,
      registradoPorId: true,
      createdAt: true,
    },
  });
}

/** Historia del contrato vigente de la persona; nulo si no tiene contrato vigente. */
export async function cargarContrato(db: TenantTx, personaId: string) {
  const v = await vinculoVigente(db, personaId);
  if (!v) return null;
  return calcularContrato(v, await periodosValidos(db, v.id));
}
