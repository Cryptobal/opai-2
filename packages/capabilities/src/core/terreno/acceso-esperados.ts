import { z } from "zod";

import { fechaDia, hoyEmpresa } from "../../acceso/prerregistro-comun";
import { cursorDe, pagina } from "../maestros/comun";
import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo } from "./hechos-comun";

/**
 * «Esperados hoy» para la portería del equipo de terreno (CAR-478, R14): los visitantes prerregistrados para hoy en
 * la instalación del equipo, con el documento enmascarado y si ya entraron. La portería los usa para llenar el
 * formulario al leer una invitación (también sin conexión, con lo último que bajó).
 */
export const accesoEsperadosTerreno = defineCapability({
  id: "core.terreno.esperados",
  descripcion:
    "Lista, para la portería del equipo de terreno emparejado, los visitantes prerregistrados para hoy en su instalación: nombre, empresa, documento enmascarado, horario esperado, anfitrión, nota para el guardia y si ya entraron. Requiere el módulo Control de acceso activo; nunca entrega el número del documento ni la patente.",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente consulta con acceso.prerregistros.listar y su alcance.
  interna: true,
  input: z.object({
    dispositivoId: uuidSchema,
    cursor: z.uuid().optional().describe("Id del último visitante de la página anterior."),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({
    activo: z.boolean(),
    dia: z.string(),
    siguiente: z.string().nullable(),
    items: z.array(
      z.object({
        visitanteId: uuidSchema,
        nombre: z.string(),
        empresa: z.string().nullable(),
        documento: z.string(),
        desdeMin: z.number().int().nullable(),
        hastaMin: z.number().int().nullable(),
        anfitrion: z.string(),
        motivo: z.string().nullable(),
        nota: z.string().nullable(),
        ingreso: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((v) => v.visitanteId),
  async handler(ctx, { dispositivoId, cursor, limite }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    const dia = await hoyEmpresa(ctx);
    if (!ctx.modulosActivos.includes("acceso"))
      return { activo: false, dia, siguiente: null, items: [] };
    const hoy = fechaDia(dia);
    const filas = await ctx.db.prerregistroVisitante.findMany({
      where: {
        prerregistro: {
          instalacionId: disp.instalacionId,
          canceladoEn: null,
          desde: { lte: hoy },
          hasta: { gte: hoy },
        },
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      ...cursorDe(cursor, limite),
      include: { prerregistro: true, usos: { where: { dia: hoy }, select: { id: true } } },
    });
    const { items, siguiente } = pagina(filas, limite, cursor);
    return {
      activo: true,
      dia,
      siguiente,
      items: items.map((v) => ({
        visitanteId: v.id,
        nombre: v.nombre,
        empresa: v.empresa,
        documento: v.mascara,
        desdeMin: v.prerregistro.desdeMin,
        hastaMin: v.prerregistro.hastaMin,
        anfitrion: v.prerregistro.anfitrion,
        motivo: v.prerregistro.motivo,
        nota: v.prerregistro.nota,
        ingreso: v.usos.length > 0,
      })),
    };
  },
});
