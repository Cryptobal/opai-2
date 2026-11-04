import { z } from "zod";

import { agingVacio, diasVencido, estaVencida, saldoPendiente, tramoDe, vencimientoEfectivo } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { documentosCobrables, parametrosCobranza } from "./cobranza-datos";
import { agingSchema, deudorSchema, facturaVencidaSchema, gestionSchema } from "./cobranza-vistas";

export const cobranzaResumen = defineCapability({
  id: "finanzas.cobranza.resumen",
  descripcion:
    "Resumen de cobranza: saldo vencido por tramo de antigüedad (1-30, 31-60, 61+ días) y lista de deudores con su saldo, atraso máximo y última gestión. El vencimiento se calcula con la fecha del documento o el plazo de cobro por defecto de la empresa.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({ hoy: z.string(), tramos: agingSchema, totalVencido: z.number().int(), deudores: z.array(deudorSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.deudores.map((d) => d.cuentaId),
  async handler(ctx) {
    const { hoy, plazoDefectoDias } = await parametrosCobranza(ctx);
    const docs = await documentosCobrables(ctx);
    const tramos = agingVacio();
    const porCuenta = new Map<string, { n: number; saldo: number; atraso: number }>();
    for (const d of docs) {
      if (!estaVencida(d, hoy, plazoDefectoDias)) continue;
      const atraso = diasVencido(vencimientoEfectivo(d, plazoDefectoDias) as string, hoy);
      tramos[tramoDe(atraso)] += saldoPendiente(d);
      const c = porCuenta.get(d.cuentaId) ?? { n: 0, saldo: 0, atraso: 0 };
      porCuenta.set(d.cuentaId, { n: c.n + 1, saldo: c.saldo + saldoPendiente(d), atraso: Math.max(c.atraso, atraso) });
    }
    const ids = [...porCuenta.keys()];
    const [cuentas, gestiones] = ids.length
      ? await Promise.all([
          ctx.db.cuenta.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, rut: true } }),
          ctx.db.cobranzaGestion.groupBy({ by: ["cuentaId"], where: { cuentaId: { in: ids } }, _max: { createdAt: true } }),
        ])
      : [[], []];
    const nombre = new Map(cuentas.map((c) => [c.id, c]));
    const ultima = new Map(gestiones.map((g) => [g.cuentaId, g._max.createdAt?.toISOString() ?? null]));
    const deudores = ids
      .map((id) => {
        const c = porCuenta.get(id) as { n: number; saldo: number; atraso: number };
        return {
          cuentaId: id,
          nombre: nombre.get(id)?.nombre ?? "—",
          rut: nombre.get(id)?.rut ?? null,
          facturasVencidas: c.n,
          saldoVencido: c.saldo,
          atrasoMaximoDias: c.atraso,
          tramo: tramoDe(c.atraso),
          ultimaGestion: ultima.get(id) ?? null,
        };
      })
      .sort((a, b) => b.atrasoMaximoDias - a.atrasoMaximoDias || b.saldoVencido - a.saldoVencido);
    return { hoy, tramos, totalVencido: deudores.reduce((s, d) => s + d.saldoVencido, 0), deudores };
  },
});

export const cobranzaDeudor = defineCapability({
  id: "finanzas.cobranza.deudor",
  descripcion:
    "Ficha de un deudor: sus facturas vencidas con atraso, saldo y pasos de recordatorio ya enviados, los contactos de facturación a quienes llegan los recordatorios y el historial de gestiones de cobranza.",
  permiso: PERMISO_READ,
  input: z.object({ cuentaId: uuidSchema }),
  output: z.object({
    cuentaId: z.string(),
    nombre: z.string(),
    rut: z.string().nullable(),
    saldoVencido: z.number().int(),
    facturas: z.array(facturaVencidaSchema),
    contactos: z.array(z.object({ nombre: z.string(), email: z.string().nullable(), telefono: z.string().nullable() })),
    gestiones: z.array(gestionSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.cuentaId],
  async handler(ctx, input) {
    const cuenta = await ctx.db.cuenta.findFirst({ where: { id: input.cuentaId }, select: { id: true, nombre: true, rut: true } });
    if (!cuenta) throw noEncontrado("El cliente");
    const { hoy, plazoDefectoDias } = await parametrosCobranza(ctx);
    const docs = await documentosCobrables(ctx, cuenta.id);
    const [gestiones, contactos] = await Promise.all([
      ctx.db.cobranzaGestion.findMany({ where: { cuentaId: cuenta.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      ctx.db.contacto.findMany({
        where: { cuentaId: cuenta.id, estado: "activo", archivadoEn: null, anonimizadoEn: null, roles: { has: "facturacion" } },
        orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
      }),
    ]);
    const facturas = docs
      .filter((d) => estaVencida(d, hoy, plazoDefectoDias))
      .map((d) => {
        const atraso = diasVencido(vencimientoEfectivo(d, plazoDefectoDias) as string, hoy);
        return {
          documentoId: d.id,
          folio: d.folio,
          vencimiento: vencimientoEfectivo(d, plazoDefectoDias) as string,
          atrasoDias: atraso,
          saldo: saldoPendiente(d),
          tramo: tramoDe(atraso),
          pausada: d.cobranzaPausada ?? false,
          pasosEnviados: gestiones
            .filter((g) => g.documentoId === d.id && g.origen === "automatico" && g.resultado === "enviado" && g.paso)
            .map((g) => g.paso as number),
        };
      });
    return {
      cuentaId: cuenta.id,
      nombre: cuenta.nombre,
      rut: cuenta.rut,
      saldoVencido: facturas.reduce((s, f) => s + f.saldo, 0),
      facturas,
      contactos: contactos.map((c) => ({ nombre: `${c.nombres} ${c.apellidos}`.trim(), email: c.email, telefono: c.telefono })),
      gestiones: gestiones.map((g) => ({
        id: g.id,
        documentoId: g.documentoId,
        canal: g.canal as "correo" | "whatsapp_manual" | "nota",
        origen: g.origen as "manual" | "automatico",
        paso: g.paso,
        resultado: g.resultado as "enviado" | "fallido" | "omitido",
        detalle: g.detalle,
        creadoPor: g.creadoPor,
        fecha: g.createdAt.toISOString(),
      })),
    };
  },
});
