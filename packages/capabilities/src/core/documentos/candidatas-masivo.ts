// Personas que pueden recibir una plantilla laboral en lote (CAR-633).
import { z } from "zod";

import { ambitoDeClase, documentoUsaVariablesSensibles, PERMISOS_CORE, type ClasePlantilla } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "../maestros/comun";
import { dondePersona } from "../maestros/alcance";
import { calcularRelleno } from "./rellenar-calculo";
import { plantillaVigente } from "./plantilla-vigente";

const LIMITE = 500;

type ItemCandidata = {
  personaId: string;
  nombre: string;
  descripcion: string;
  puedeGenerar: boolean;
  motivoBloqueo: string | null;
};

export const documentoPlantillasCandidatas = defineCapability({
  id: "core.documento_plantillas.candidatas",
  descripcion:
    "Lista las personas del tenant que pueden recibir una plantilla laboral en lote: filtra por instalación, cargo o anexos en borrador, marca quién tiene todos los datos para generar y quién no puede firmar. Solo plantillas sobre persona. No guarda nada.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    plantillaId: uuidSchema,
    instalacionId: uuidSchema.optional(),
    cargoId: uuidSchema.optional(),
    soloVinculoVigente: z.boolean().default(true).describe("Solo personas con vínculo vigente."),
    anexoBorrador: z
      .boolean()
      .optional()
      .describe("Si es verdadero, solo personas con un anexo de contrato en borrador."),
    fecha: diaSchema.optional(),
    q: z.string().trim().max(80).optional(),
  }),
  output: z.object({
    items: z.array(
      z.object({
        personaId: z.string(),
        nombre: z.string(),
        descripcion: z.string().describe("Cargo e instalación del vínculo vigente."),
        puedeGenerar: z.boolean(),
        motivoBloqueo: z.string().nullable(),
      }),
    ),
    total: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((p) => p.personaId),
  async handler(ctx, input) {
    const { plantilla, version } = await plantillaVigente(ctx, input.plantillaId);
    if (ambitoDeClase(plantilla.clase as ClasePlantilla) !== "persona")
      throw reglaDeNegocio("Solo las plantillas laborales admiten envío masivo.");
    if (input.anexoBorrador && !ctx.autorizar(PERMISOS_CORE.anexosRead))
      throw prohibido("Sin permiso para filtrar por anexos de contrato.");
    const rut = (input.q ?? "").replace(/[.\s]/g, "").toUpperCase();
    const where = {
      AND: [
        dondePersona(ctx),
        { archivadaEn: null },
        {
          vinculos: {
            some: {
              ...(input.soloVinculoVigente ? { estado: "vigente" } : {}),
              ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
              ...(input.cargoId ? { cargoId: input.cargoId } : {}),
            },
          },
        },
        ...(input.anexoBorrador ? [{ anexos: { some: { estado: "borrador" } } }] : []),
        ...(input.q
          ? [
              {
                OR: [
                  { nombres: { contains: input.q, mode: "insensitive" as const } },
                  { apellidos: { contains: input.q, mode: "insensitive" as const } },
                  { rut: { startsWith: rut } },
                ],
              },
            ]
          : []),
      ],
    };
    const fecha = input.fecha ?? hoy();
    const conSueldo = documentoUsaVariablesSensibles(version.contenido);
    const filas = await ctx.db.persona.findMany({
      where,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      take: LIMITE,
      include: {
        vinculos: {
          where: { estado: "vigente" },
          include: { cargo: { select: { nombre: true } }, instalacion: { select: { nombre: true } } },
          take: 1,
        },
      },
    });
    const items: ItemCandidata[] = [];
    for (const p of filas) {
      const v = p.vinculos[0];
      const descripcion = v
        ? `${v.cargo.nombre}${v.instalacion ? ` · ${v.instalacion.nombre}` : ""}`
        : "Sin vínculo vigente";
      let puedeGenerar = false;
      let motivoBloqueo: string | null = null;
      try {
        const { faltantes } = await calcularRelleno(ctx, {
          plantillaId: plantilla.id,
          personaId: p.id,
          fecha,
        });
        if (faltantes.length) {
          motivoBloqueo = faltantes.map((f) => f.etiqueta).join(", ");
        } else if (conSueldo && !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) {
          motivoBloqueo = "Necesitas lectura sensible de sueldos.";
        } else puedeGenerar = true;
      } catch (e) {
        motivoBloqueo = e instanceof Error ? e.message : "No se pudo preparar el documento.";
      }
      items.push({
        personaId: p.id,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        descripcion,
        puedeGenerar,
        motivoBloqueo,
      });
    }
    return { items, total: items.length };
  },
});