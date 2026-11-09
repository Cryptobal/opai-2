import { z } from "zod";

import {
  dependenciaFaltante,
  DIAS_PRUEBA_GRATIS,
  diasRestantesPrueba,
  ENTRADAS_CATALOGO,
  esParteFinanzas,
  estadoPruebaGratis,
  MODULO_FINANZAS,
  motivoSinPrueba,
  PERMISOS_CORE,
  PLAN_BASE,
  partesConPrecio,
  textoPrecioLista,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { obtenerModulo } from "../../module";
import { dia, hoy } from "../maestros/comun";
import { precioListaSchema } from "../plataforma/catalogo/datos";

const MODULO_AJUSTE_CATALOGO = "catalogo";

const itemSchema = z.object({
  id: z
    .string()
    .describe("Id del cobrable: un módulo o una parte de Finanzas (`finanzas.bancos`)."),
  nombre: z.string(),
  incluye: z.string(),
  grupo: z.enum(["modulo", "finanzas", "parte_finanzas"]),
  textoPrecio: z.string().nullable().describe("Precio de lista escrito; null si aún no se fija."),
  estado: z
    .enum(["disponible", "en_prueba", "vencida", "no_disponible"])
    .describe(
      "disponible: puede activar la prueba; en_prueba: vigente; vencida: terminó (la extiende OPAI); no_disponible: ver `motivo`.",
    ),
  hasta: z.string().nullable().describe("Último día de la prueba, si la activó."),
  diasRestantes: z.number().int().nullable(),
  motivo: z.string().nullable().describe("Por qué no puede activarla ahora."),
});

type Item = z.infer<typeof itemSchema>;

export const modulesPruebas = defineCapability({
  id: "core.modules.pruebas",
  descripcion:
    "Lo que esta empresa puede probar gratis: cada módulo y cada parte de Finanzas con su precio de lista, si ya usó su prueba de 10 días (y cuánto le queda) o por qué no puede activarla; indica además si falta completar el RUT de la empresa, requisito para activar una prueba.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: z.object({
    dias: z.number().int().describe("Duración de la prueba gratis."),
    rutCompleto: z.boolean().describe("false: completar el RUT antes de activar una prueba."),
    items: z.array(itemSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const tenantId = ctx.tenantId;
    const [perfil, modulos, pruebas, condiciones, ajustes] = await Promise.all([
      ctx.db.perfilEmpresa.findFirst({ where: { tenantId } }),
      ctx.db.tenantModule.findMany({ where: { tenantId } }),
      ctx.db.pruebaGratis.findMany({ where: { tenantId } }),
      ctx.db.cobroCondicion.findMany({ where: { tenantId } }),
      ctx.db.ajustePlataforma.findMany({ where: { modulo: MODULO_AJUSTE_CATALOGO } }),
    ]);
    const estados = new Map(modulos.map((m) => [m.moduloId, m.estado]));
    const probadas = new Map(pruebas.map((p) => [p.moduloId, dia(p.hasta) ?? hoy()]));
    const conPrecio = partesConPrecio([...probadas.keys(), ...condiciones.map((c) => c.moduloId)]);
    const listas = new Map<string, string>();
    for (const a of ajustes) {
      const r = precioListaSchema.safeParse(a.valor);
      if (r.success) listas.set(a.clave, textoPrecioLista(r.data));
    }
    const items: Item[] = [];
    for (const e of ENTRADAS_CATALOGO) {
      if (e.id === PLAN_BASE || e.incluidoEnBase) continue;
      const modulo = esParteFinanzas(e.id) ? MODULO_FINANZAS : e.id;
      if (!obtenerModulo(modulo)) continue;
      const hasta = probadas.get(e.id) ?? null;
      const base = {
        id: e.id,
        nombre: e.nombre,
        incluye: e.incluye,
        grupo: e.grupo === "base" ? "modulo" : e.grupo,
        textoPrecio: listas.get(e.id) ?? null,
        hasta,
      };
      if (hasta) {
        const vigente = estadoPruebaGratis(hasta, hoy()) === "vigente";
        items.push({
          ...base,
          estado: vigente ? "en_prueba" : "vencida",
          diasRestantes: diasRestantesPrueba(hasta, hoy()),
          motivo: vigente ? null : "La prueba terminó: pídele a OPAI que la extienda.",
        });
        continue;
      }
      const motivo =
        motivoSinPrueba(
          e.id,
          e.nombre,
          estados.get(e.id) ?? null,
          estados.get(MODULO_FINANZAS) ?? null,
        ) ??
        (esParteFinanzas(e.id) ? dependenciaFaltante(e.id, conPrecio) : null) ??
        (esParteFinanzas(e.id)
          ? null
          : ((obtenerModulo(modulo)?.dependencias ?? [])
              .filter((d) => !["activo", "trial", "solo_lectura"].includes(estados.get(d) ?? ""))
              .map((d) => `Activa antes ${d}.`)[0] ?? null));
      items.push({
        ...base,
        estado: motivo ? "no_disponible" : "disponible",
        diasRestantes: null,
        motivo,
      });
    }
    return { dias: DIAS_PRUEBA_GRATIS, rutCompleto: Boolean(perfil?.rut), items };
  },
});
