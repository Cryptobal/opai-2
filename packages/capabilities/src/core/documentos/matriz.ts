import { z } from "zod";

import { diasHasta, estadoVigencia, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import { dondePersona } from "../maestros/alcance";
import { dia, hoy } from "../maestros/comun";
import { vinculosVigentes } from "../maestros/personas-vista";

const ESTADOS = ["vigente", "por_vencer", "vencido", "sin_fecha", "falta"] as const;
type Celda = z.input<typeof celdaSchema>;
const celdaSchema = z.object({
  tipoId: z.string(),
  estado: z.enum(ESTADOS),
  dias: z.number().nullable().describe("Días hasta el vencimiento (negativo si venció)."),
  documentoId: z.string().nullable(),
});

/**
 * Celdas de una persona: el documento más reciente de cada tipo (por su vínculo de propietario).
 * Un tipo obligatorio sin documento es "falta"; uno opcional sin documento no se informa.
 */
function celdas(
  tipos: { id: string; obligatorio: boolean; diasAlerta: number }[],
  docs: { id: string; tipoId: string | null; venceEn: Date | null; version: number }[],
) {
  return tipos.flatMap((t): Celda[] => {
    const d = docs.filter((x) => x.tipoId === t.id).sort((a, b) => b.version - a.version)[0];
    if (!d)
      return t.obligatorio
        ? [{ tipoId: t.id, estado: "falta" as const, dias: null, documentoId: null }]
        : [];
    const vence = dia(d.venceEn);
    return [
      {
        tipoId: t.id,
        estado: estadoVigencia(vence, hoy(), t.diasAlerta),
        dias: vence ? diasHasta(vence, hoy()) : null,
        documentoId: d.id,
      },
    ];
  });
}

export const documentosMatriz = defineCapability({
  id: "core.documentos.matriz",
  descripcion:
    "Semáforo de vencimientos por persona: para cada persona activa, el estado de cada tipo de documento obligatorio o con vencimiento (vigente, días para vencer, vencido o falta). Sirve para pedir renovaciones en bloque. Hasta 2.000 personas; exige también leer personas.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({
    soloPendientes: z
      .boolean()
      .default(false)
      .describe("Solo personas con algo vencido, por vencer o faltante."),
    cargoId: z.uuid().optional(),
  }),
  output: z.object({
    tipos: z.array(z.object({ id: z.string(), nombre: z.string(), obligatorio: z.boolean() })),
    filas: z.array(
      z.object({
        personaId: z.string(),
        nombre: z.string(),
        cargo: z.string().nullable(),
        instalacion: z.string().nullable(),
        celdas: z.array(celdaSchema),
      }),
    ),
    resumen: z.object({
      personas: z.number(),
      conPendientes: z.number(),
      vencidos: z.number(),
      porVencer: z.number(),
      faltan: z.number(),
    }),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // Lista nombres y cargos de las personas: exige también leer personas.
    if (!ctx.autorizar(PERMISOS_CORE.personasRead)) throw prohibido("No puedes ver personas.");
    const tipos = await ctx.db.documentoTipo.findMany({
      where: {
        capa: "persona",
        activo: true,
        OR: [{ obligatorio: true }, { tieneVencimiento: true }],
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    const personas = await ctx.db.persona.findMany({
      // Alcance por filas (ADR-022): el supervisor solo ve las personas a su cargo (hoy ninguna, 07b).
      where: { archivadaEn: null, estado: { not: "inactiva" }, AND: [dondePersona(ctx)] },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      take: 2000,
    });
    const vinculos = await vinculosVigentes(
      ctx,
      personas.map((p) => p.id),
    );
    const propios = await ctx.db.documentoVinculo.findMany({
      where: {
        entidadTipo: "persona",
        entidadId: { in: personas.map((p) => p.id) },
        rol: "propietario",
      },
      select: { documentoId: true, entidadId: true },
    });
    const docs = await ctx.db.documento.findMany({
      where: { id: { in: propios.map((v) => v.documentoId) }, estado: "disponible" },
      select: { id: true, tipoId: true, venceEn: true, version: true },
    });
    const dueno = new Map(propios.map((v) => [v.documentoId, v.entidadId]));
    const filas = personas
      .filter((p) => !input.cargoId || vinculos.get(p.id)?.cargoId === input.cargoId)
      .map((p) => ({
        personaId: p.id,
        nombre: `${p.nombres} ${p.apellidos}`,
        cargo: vinculos.get(p.id)?.cargo ?? null,
        instalacion: null,
        celdas: celdas(
          tipos,
          docs.filter((d) => dueno.get(d.id) === p.id),
        ),
      }));
    const pendiente = (e: string) => e === "vencido" || e === "por_vencer" || e === "falta";
    const todas = filas.flatMap((f) => f.celdas);
    const conPendientes = filas.filter((f) => f.celdas.some((c) => pendiente(c.estado)));
    return {
      tipos: tipos.map((t) => ({ id: t.id, nombre: t.nombre, obligatorio: t.obligatorio })),
      filas: input.soloPendientes ? conPendientes : filas,
      resumen: {
        personas: filas.length,
        conPendientes: conPendientes.length,
        vencidos: todas.filter((c) => c.estado === "vencido").length,
        porVencer: todas.filter((c) => c.estado === "por_vencer").length,
        faltan: todas.filter((c) => c.estado === "falta").length,
      },
    };
  },
});
