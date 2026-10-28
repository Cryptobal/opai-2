// Siembra idempotente del catálogo base de Comercial (Brief 07 · PR 1): embudo por defecto con sus
// etapas y los catálogos de tipos, orígenes y motivos de pérdida.
import type { TenantDb } from "./for-tenant";

/** Lo mínimo para sembrar el catálogo base de Comercial (Brief 07 · PR 1). */
export type ClienteComercial = Pick<
  TenantDb,
  "embudo" | "etapa" | "tipoNegocio" | "origenNegocio" | "motivoPerdida"
>;

// Embudo por defecto: los 8 nombres de etapa del embudo de Gard de 1.0 (alcance-crm.md «Decide Carlos»
// punto 2), con la etapa ganada llamada «Adjudicado» (Page de decisiones del 25-oct). 6 abiertas, 1
// ganada, 1 perdida. `exige` son los requisitos de entrada (R9). La ganada NO exige cotización por
// ahora: «ganar sin cotización» está habilitado hasta que exista CPQ (decisión de Carlos 26-oct 15:12).
const ETAPAS_BASE = [
  { nombre: "Prospecto", tipo: "abierta", prob: 10, tono: "neutral", exige: [] as string[] },
  { nombre: "Calificado", tipo: "abierta", prob: 20, tono: "neutral", exige: [] },
  { nombre: "Visita técnica", tipo: "abierta", prob: 35, tono: "neutral", exige: ["monto"] },
  {
    nombre: "Propuesta enviada",
    tipo: "abierta",
    prob: 50,
    tono: "warning",
    exige: ["monto", "fecha_cierre"],
  },
  {
    nombre: "Negociación",
    tipo: "abierta",
    prob: 70,
    tono: "warning",
    exige: ["monto", "fecha_cierre"],
  },
  {
    nombre: "Firma de contrato",
    tipo: "abierta",
    prob: 90,
    tono: "warning",
    exige: ["monto", "fecha_cierre"],
  },
  { nombre: "Adjudicado", tipo: "ganada", prob: 100, tono: "success", exige: ["inicio_servicio"] },
  { nombre: "Perdido", tipo: "perdida", prob: 0, tono: "danger", exige: ["motivo_perdida"] },
] as const;

const TIPOS_NEGOCIO_BASE = [
  "Nuevo cliente",
  "Nueva instalación",
  "Ampliación de dotación",
  "Renovación de contrato",
  "Servicio temporal",
  "Licitación privada",
] as const;

const ORIGENES_BASE = [
  "Sitio web",
  "Referido",
  "Cliente actual",
  "Prospección en frío",
  "Licitación",
] as const;

// Catálogo cerrado de 1.0 (comercial.md §4); editable por tenant. `exigeDetalle` en "otro".
const MOTIVOS_PERDIDA_BASE = [
  { codigo: "precio", nombre: "Precio" },
  { codigo: "cobertura", nombre: "Cobertura" },
  { codigo: "plazo", nombre: "Plazo" },
  { codigo: "sin_respuesta", nombre: "Sin respuesta" },
  { codigo: "competencia", nombre: "Eligió a la competencia" },
  { codigo: "no_califica", nombre: "No califica" },
  { codigo: "otro", nombre: "Otro" },
] as const;

/**
 * Siembra idempotente del catálogo base de Comercial para un tenant: un embudo por defecto con sus 8
 * etapas y los catálogos de tipos, orígenes y motivos. No crea ningún negocio (alcance-crm.md §1).
 */
export async function sembrarComercial(db: ClienteComercial, tenantId: string) {
  let embudo = await db.embudo.findFirst({ where: { tenantId, porDefecto: true } });
  if (!embudo) {
    embudo = await db.embudo.create({
      data: { tenantId, nombre: "Embudo de ventas", porDefecto: true },
    });
  }
  for (const [i, e] of ETAPAS_BASE.entries()) {
    await db.etapa.upsert({
      where: { tenantId_embudoId_orden: { tenantId, embudoId: embudo.id, orden: i } },
      update: {},
      create: {
        tenantId,
        embudoId: embudo.id,
        nombre: e.nombre,
        orden: i,
        tipo: e.tipo,
        probabilidad: e.prob,
        tono: e.tono,
        exige: [...e.exige],
      },
    });
  }
  for (const [i, nombre] of TIPOS_NEGOCIO_BASE.entries()) {
    await db.tipoNegocio.upsert({
      where: { tenantId_nombre: { tenantId, nombre } },
      update: {},
      create: { tenantId, nombre, orden: i },
    });
  }
  for (const [i, nombre] of ORIGENES_BASE.entries()) {
    await db.origenNegocio.upsert({
      where: { tenantId_nombre: { tenantId, nombre } },
      update: {},
      create: { tenantId, nombre, orden: i },
    });
  }
  for (const [i, m] of MOTIVOS_PERDIDA_BASE.entries()) {
    await db.motivoPerdida.upsert({
      where: { tenantId_codigo: { tenantId, codigo: m.codigo } },
      update: {},
      create: {
        tenantId,
        codigo: m.codigo,
        nombre: m.nombre,
        orden: i,
        exigeDetalle: m.codigo === "otro",
      },
    });
  }
}
