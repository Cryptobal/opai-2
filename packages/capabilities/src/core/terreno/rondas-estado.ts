import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo, iso } from "./hechos-comun";

/**
 * «Mis rondas» del equipo de terreno (CAR-78 · E3e): las rondas que la instalación permite iniciar (con sus
 * puntos, sin códigos QR) y las que este equipo dejó abiertas, con los puntos que el servidor ya recibió.
 */
export const rondasEstadoTerreno = defineCapability({
  id: "core.terreno.rondas",
  descripcion:
    "Lista, para el equipo de terreno emparejado, las rondas que su instalación permite iniciar con sus puntos de control y las rondas que el equipo dejó abiertas con los puntos ya marcados. Requiere el módulo Rondas activo; nunca entrega códigos QR ni coordenadas.",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente consulta con rondas.plantillas.listar y rondas.puntos.listar y su alcance.
  interna: true,
  input: z.object({ dispositivoId: uuidSchema }),
  output: z.object({
    activo: z.boolean(),
    plantillas: z.array(
      z.object({
        id: uuidSchema,
        nombre: z.string(),
        puntos: z.array(z.object({ id: uuidSchema, nombre: z.string(), obligatorio: z.boolean() })),
      }),
    ),
    abiertas: z.array(
      z.object({
        clave: uuidSchema,
        plantillaId: uuidSchema,
        inicio: z.string(),
        marcados: z.array(uuidSchema),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.plantillas.map((p) => p.id),
  async handler(ctx, { dispositivoId }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    if (!ctx.modulosActivos.includes("rondas"))
      return { activo: false, plantillas: [], abiertas: [] };
    const desde = new Date(Date.now() - 24 * 3_600_000);
    const [plantillas, abiertas] = await Promise.all([
      ctx.db.plantillaRonda.findMany({
        where: { instalacionId: disp.instalacionId, estado: "activo", permiteAdhoc: true },
        orderBy: { nombre: "asc" },
        take: 50,
        select: {
          id: true,
          nombre: true,
          puntos: {
            orderBy: { orden: "asc" },
            select: { obligatorio: true, punto: { select: { id: true, nombre: true } } },
          },
        },
      }),
      ctx.db.ejecucionRonda.findMany({
        where: { dispositivoId: disp.id, cierre: null, horaInicio: { gte: desde } },
        orderBy: { horaInicio: "desc" },
        take: 20,
        select: {
          clave: true,
          plantillaId: true,
          horaInicio: true,
          marcas: { select: { puntoId: true } },
        },
      }),
    ]);
    return {
      activo: true,
      plantillas: plantillas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        puntos: p.puntos.map((x) => ({
          id: x.punto.id,
          nombre: x.punto.nombre,
          obligatorio: x.obligatorio,
        })),
      })),
      abiertas: abiertas.map((e) => ({
        clave: e.clave,
        plantillaId: e.plantillaId,
        inicio: iso(e.horaInicio),
        marcados: [...new Set(e.marcas.map((m) => m.puntoId))],
      })),
    };
  },
});
