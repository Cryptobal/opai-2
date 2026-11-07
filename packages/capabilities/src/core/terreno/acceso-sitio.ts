import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo, iso } from "./hechos-comun";

/**
 * «En sitio» para la portería del equipo de terreno (CAR-78 · E4d): quiénes entraron a la instalación del equipo
 * y siguen dentro, con el documento enmascarado. La patente completa no sale por aquí (acceso restringido).
 */
export const accesoEnSitioTerreno = defineCapability({
  id: "core.terreno.en_sitio",
  descripcion:
    "Lista, para la portería del equipo de terreno emparejado, quiénes están hoy en la instalación: nombre, empresa, tipo de registro, documento enmascarado y hora de entrada. Requiere el módulo Control de acceso activo; nunca entrega el número completo del documento ni la patente.",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente consulta con acceso.registros.listar y su alcance.
  interna: true,
  input: z.object({ dispositivoId: uuidSchema }),
  output: z.object({
    activo: z.boolean(),
    items: z.array(
      z.object({
        id: uuidSchema,
        clave: uuidSchema,
        nombre: z.string(),
        empresa: z.string().nullable(),
        tipoRegistro: z.string(),
        documento: z.string(),
        entradaEn: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((r) => r.id),
  async handler(ctx, { dispositivoId }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    if (!ctx.modulosActivos.includes("acceso")) return { activo: false, items: [] };
    // Solo el día corriente y los que siguen dentro: la portería no necesita el historial.
    const desde = new Date(Date.now() - 36 * 3_600_000);
    const filas = await ctx.db.registroAcceso.findMany({
      where: { instalacionId: disp.instalacionId, salida: null, horaCorregida: { gte: desde } },
      orderBy: { horaCorregida: "desc" },
      take: 200,
      select: {
        id: true,
        clave: true,
        nombre: true,
        empresa: true,
        tipoRegistro: true,
        mascara: true,
        horaCorregida: true,
      },
    });
    return {
      activo: true,
      items: filas.map((r) => ({
        id: r.id,
        clave: r.clave,
        nombre: r.nombre,
        empresa: r.empresa,
        tipoRegistro: r.tipoRegistro,
        documento: r.mascara,
        entradaEn: iso(r.horaCorregida),
      })),
    };
  },
});
