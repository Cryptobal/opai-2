import { z } from "zod";

import { accesoDelActor, defineCapability, noEncontrado, type Contexto } from "@opai/capabilities";

import { totalesDocumento } from "../domain/documento/totales";
import { tasaIvaVentaTenant } from "../persistencia/tasa-iva-tenant";
import { uuidSchema } from "./esquemas";
import { cotizacionesVisibles } from "./portal-cotizaciones-alcance";

/**
 * Sin permiso de módulo (`permiso: null`): el acceso lo decide `accesoDelActor` (FAIL-CLOSED, ADR-022), que solo
 * deja pasar a un contacto de cliente con acceso activo a su cuenta; el resto recibe FORBIDDEN.
 */
const PERMISO_PORTAL = null;
const ESTADOS_ENVIADOS = ["enviada", "aceptada"];

const totalesSchema = z.object({
  netoMensualClp: z.number().int().nullable(),
  ivaClp: z.number().int().nullable(),
  totalMensualClp: z.number().int().nullable(),
});
const itemSchema = z.object({
  cotizacionId: uuidSchema,
  codigo: z.string(),
  titulo: z.string(),
  versionNumero: z.number().int(),
  enviadaEn: z.string().nullable(),
  validaHasta: z.string().nullable(),
  ...totalesSchema.shape,
  tienePropuesta: z.boolean(),
});

/**
 * Cotizaciones enviadas de la cuenta del contacto (ADR-022): el alcance se aplica en la consulta, no en la
 * pantalla. Solo versiones ya enviadas o aceptadas, nunca borradores; sin costos, márgenes ni parámetros.
 */
async function enviadasDeMiCuenta(ctx: Contexto, cotizacionId?: string) {
  // Un prospecto (acceso «limitado», CAR-300) también entra, pero solo a su propuesta vigente.
  const { cuentaId, alcance, accesoId } = await accesoDelActor(ctx, { permitirLimitado: true });
  const cots = await cotizacionesVisibles(ctx, { cuentaId, alcance, accesoId, cotizacionId });
  const versiones = await ctx.db.cpqVersion.findMany({
    where: { cotizacionId: { in: cots.map((c) => c.id) }, estado: { in: ESTADOS_ENVIADOS }, enviadaEn: { not: null } },
    orderBy: [{ numero: "desc" }],
  });
  const tasa = await tasaIvaVentaTenant(ctx);
  const envios = await ctx.db.cpqPropuestaEnvio.findMany({
    where: { cotizacionId: { in: cots.map((c) => c.id) }, estado: "enviado" },
    orderBy: [{ enviadoEn: "desc" }],
  });
  return cots.flatMap((c) => {
    const version = versiones.find((v) => v.cotizacionId === c.id);
    if (!version) return [];
    const neto = version.ventaMensualClp;
    const t = neto == null ? null : totalesDocumento(neto, tasa);
    const envio = envios.find((e) => e.versionId === version.id);
    return [{ cot: c, version, envio, totales: { netoMensualClp: t?.netoClp ?? null, ivaClp: t?.ivaClp ?? null, totalMensualClp: t?.totalClp ?? null } }];
  });
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const fecha = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const portalCotizacionesList = defineCapability({
  auditarLectura: (s) => s.items.map((i) => i.cotizacionId),
  id: "cpq.portal_cotizaciones.list",
  descripcion:
    "Lista al contacto del cliente las cotizaciones que su empresa de seguridad le envió, con su estado, vigencia y totales (neto, IVA y total mensual). Solo ve las de su cuenta y ya enviadas; nunca borradores, costos ni márgenes.",
  permiso: PERMISO_PORTAL,
  input: z.object({}),
  output: z.object({ items: z.array(itemSchema) }),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx) {
    const filas = await enviadasDeMiCuenta(ctx);
    return {
      items: filas.map(({ cot, version, envio, totales }) => ({
        cotizacionId: cot.id,
        codigo: cot.codigo,
        titulo: cot.titulo,
        versionNumero: version.numero,
        enviadaEn: iso(version.enviadaEn),
        validaHasta: fecha(version.validaHasta),
        ...totales,
        tienePropuesta: Boolean(envio?.documentoPropuestaId),
      })),
    };
  },
});

export const portalCotizacionesGet = defineCapability({
  auditarLectura: (s) => [s.cotizacionId],
  id: "cpq.portal_cotizaciones.get",
  descripcion:
    "Muestra al contacto del cliente el detalle de una cotización que le enviaron: los puestos del servicio con su turno y cobertura, los totales y qué documentos puede descargar. Una cotización de otra cuenta o sin enviar responde «no encontrado».",
  permiso: PERMISO_PORTAL,
  input: z.object({ cotizacionId: uuidSchema }),
  output: itemSchema.extend({
    secciones: z.array(
      z.object({
        nombre: z.string(),
        puestos: z.array(
          z.object({ nombre: z.string(), posiciones: z.number().int(), patron: z.string().nullable(), horaInicio: z.string().nullable(), horaFin: z.string().nullable(), diasCobertura: z.number().int().nullable() }),
        ),
      }),
    ),
    documentos: z.array(z.object({ tipo: z.enum(["cotizacion", "propuesta"]), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const fila = (await enviadasDeMiCuenta(ctx, input.cotizacionId))[0];
    if (!fila) throw noEncontrado("La cotización");
    const { cot, version, envio, totales } = fila;
    const secs = await ctx.db.cpqSeccion.findMany({ where: { versionId: version.id }, orderBy: [{ orden: "asc" }] });
    const lineas = await ctx.db.cpqLinea.findMany({ where: { seccionId: { in: secs.map((s) => s.id) }, tipo: "puesto", visibleCliente: true }, orderBy: [{ orden: "asc" }] });
    return {
      cotizacionId: cot.id,
      codigo: cot.codigo,
      titulo: cot.titulo,
      versionNumero: version.numero,
      enviadaEn: iso(version.enviadaEn),
      validaHasta: fecha(version.validaHasta),
      ...totales,
      tienePropuesta: Boolean(envio?.documentoPropuestaId),
      secciones: secs
        .map((s) => ({
          nombre: s.nombre,
          puestos: lineas.filter((l) => l.seccionId === s.id).map((l) => ({ nombre: l.nombre, posiciones: l.posiciones, patron: l.patron, horaInicio: l.horaInicio, horaFin: l.horaFin, diasCobertura: l.diasCobertura })),
        }))
        .filter((s) => s.puestos.length),
      documentos: [
        ...(envio?.documentoCotizacionId ? [{ tipo: "cotizacion" as const, nombre: `Cotización ${cot.codigo}` }] : []),
        ...(envio?.documentoPropuestaId ? [{ tipo: "propuesta" as const, nombre: `Propuesta técnica ${cot.codigo}` }] : []),
      ],
    };
  },
});

export const portalCotizacionesDescargar = defineCapability({
  auditarLectura: (s) => [s.documentoId],
  id: "cpq.portal_cotizaciones.descargar",
  descripcion:
    "Entrega al contacto del cliente un enlace firmado de 5 minutos para descargar el PDF de la cotización o de la propuesta técnica que le enviaron. Se verifica cuenta y estado antes de firmar; de otra cuenta o sin enviar responde «no encontrado».",
  permiso: PERMISO_PORTAL,
  input: z.object({ cotizacionId: uuidSchema, tipo: z.enum(["cotizacion", "propuesta"]) }),
  output: z.object({ documentoId: uuidSchema, url: z.string(), expiraEn: z.string(), nombre: z.string() }),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  async handler(ctx, input) {
    const fila = (await enviadasDeMiCuenta(ctx, input.cotizacionId))[0];
    const documentoId = input.tipo === "cotizacion" ? fila?.envio?.documentoCotizacionId : fila?.envio?.documentoPropuestaId;
    if (!fila || !documentoId) throw noEncontrado("El documento");
    const doc = await ctx.db.documento.findFirst({ where: { id: documentoId, estado: "disponible" } });
    if (!doc) throw noEncontrado("El documento");
    const url = await ctx.servicios.almacenamiento.urlDescarga(doc.storageKey, doc.nombre, 300);
    return { documentoId: doc.id, url, expiraEn: new Date(Date.now() + 300_000).toISOString(), nombre: doc.nombre };
  },
});
