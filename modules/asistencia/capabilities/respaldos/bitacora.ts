import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { ajuste, defineCapability } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { jsonCanonico } from "@opai/domain";

import { marcaIntegra } from "../../domain";
import { registroDeFila } from "../registro-fila";

const LOTE = 500;

type Manifiesto = {
  version: 1;
  tenantId: string;
  generadoEn: string;
  desdeSeq: number;
  hastaSeq: number;
  totalMarcas: number;
  eslabones: { seq: number; hash: string }[];
};

async function construirManifiesto(tenantId: string, db: Pick<TenantTx, "marca">): Promise<Manifiesto> {
  const eslabones: { seq: number; hash: string }[] = [];
  let desde = 1;
  for (;;) {
    const lote = await db.marca.findMany({ where: { seq: { gte: desde } }, orderBy: { seq: "asc" }, take: LOTE, select: { seq: true, hash: true } });
    eslabones.push(...lote.map((m: { seq: number; hash: string }) => ({ seq: m.seq, hash: m.hash })));
    if (lote.length < LOTE) break;
    desde = lote.at(-1)!.seq + 1;
  }
  const hasta = eslabones.at(-1)?.seq ?? 0;
  return {
    version: 1, tenantId, generadoEn: new Date().toISOString(),
    desdeSeq: eslabones[0]?.seq ?? 0, hastaSeq: hasta, totalMarcas: eslabones.length, eslabones,
  };
}

export const respaldosBitacoraListar = defineCapability({
  id: "asistencia.respaldos.listar",
  descripcion: "Lista los respaldos de la bitácora con su manifiesto SHA-256.",
  permiso: "asistencia:reportes",
  input: z.object({}),
  output: z.object({
    items: z.array(z.object({
      id: z.string(), origen: z.enum(["manual", "automatico"]), manifiestoSha256: z.string(),
      totalMarcas: z.number(), desdeSeq: z.number(), hastaSeq: z.number(),
      cadenaVerificadaOk: z.boolean(), generadoEn: z.string(),
    })),
    retencionAnios: z.number(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await ctx.db.respaldoBitacora.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const retencion = (await ajuste<number>(ctx, "asistencia", "retencion_bitacora_anios")) ?? 5;
    return {
      retencionAnios: retencion,
      items: filas.map((f) => ({
        id: f.id, origen: f.origen as "manual" | "automatico", manifiestoSha256: f.manifiestoSha256,
        totalMarcas: f.totalMarcas, desdeSeq: f.desdeSeq, hastaSeq: f.hastaSeq,
        cadenaVerificadaOk: f.cadenaVerificadaOk, generadoEn: f.createdAt.toISOString(),
      })),
    };
  },
});

export const respaldosBitacoraGenerar = defineCapability({
  id: "asistencia.respaldos.generar",
  descripcion: "Genera un respaldo de la bitácora de marcas con manifiesto y hash SHA-256 verificable.",
  permiso: "asistencia:reportes",
  input: z.object({ origen: z.enum(["manual", "automatico"]).default("manual"), dryRun: z.boolean().optional() }),
  output: z.object({ id: z.string().nullable(), manifiestoSha256: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i) {
    const manifiesto = await construirManifiesto(ctx.tenantId, ctx.db);
    const cuerpo = jsonCanonico(manifiesto);
    const manifiestoSha256 = createHash("sha256").update(cuerpo).digest("hex");
    if (i.dryRun) return { id: null, manifiestoSha256 };
    const cabeza = await ctx.db.cadenaCabeza.findUnique({
      where: { tenantId_cadena: { tenantId: ctx.tenantId, cadena: "marcas" } },
    });
    const cadenaOk = Boolean(cabeza?.verificacionOk);
    const quien = ctx.usuario?.id ?? ctx.actor.id;
    const doc = await ctx.db.documento.create({
      data: {
        tenantId: ctx.tenantId, nombre: `respaldo-bitacora-${manifiesto.generadoEn.slice(0, 10)}.json`,
        mime: "application/json", tamano: Buffer.byteLength(cuerpo, "utf8"),
        storageKey: `asistencia/respaldo/${ctx.tenantId}/${randomUUID()}.json`,
        sha256: manifiestoSha256, estado: "disponible", origen: "generado", moduloOrigen: "asistencia",
        creadoPorTipo: "user", ...(quien ? { creadoPorId: quien } : {}),
      },
    });
    const fila = await ctx.db.respaldoBitacora.create({
      data: {
        tenantId: ctx.tenantId, origen: i.origen, manifiestoSha256, documentoId: doc.id,
        totalMarcas: manifiesto.totalMarcas, desdeSeq: manifiesto.desdeSeq || 0, hastaSeq: manifiesto.hastaSeq,
        cadenaVerificadaOk: cadenaOk, ...(quien ? { generadoPorId: quien } : {}),
      },
    });
    return { id: fila.id, manifiestoSha256 };
  },
});

export const respaldosBitacoraVerificar = defineCapability({
  id: "asistencia.respaldos.verificar",
  descripcion: "Verifica que el manifiesto coincida con los hashes actuales de la bitácora.",
  permiso: "asistencia:reportes",
  input: z.object({ respaldoId: z.string().uuid() }),
  output: z.object({ ok: z.boolean(), detalle: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const r = await ctx.db.respaldoBitacora.findUniqueOrThrow({ where: { id: i.respaldoId } });
    let ok = true;
    for (let seq = r.desdeSeq; seq <= r.hastaSeq; seq++) {
      const m = await ctx.db.marca.findFirst({ where: { seq } });
      if (!m) { ok = false; break; }
      const integro = await marcaIntegra(m.hash, m.hashAnterior, registroDeFila(m));
      if (!integro) { ok = false; break; }
    }
    return { ok, detalle: ok ? "Manifiesto coherente con la cadena actual." : "Hay diferencias con la bitácora actual." };
  },
});