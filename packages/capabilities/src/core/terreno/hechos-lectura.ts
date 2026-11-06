import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "../maestros/alcance";
import { dispositivoActivo, iso } from "./hechos-comun";

export const personasListarTerreno = defineCapability({
  id: "core.personas_terreno.listar",
  descripcion:
    "Lista nombre y cargo de quienes tienen vínculo laboral vigente en la instalación del equipo de terreno, para que cada guardia elija su nombre en «¿Quién eres?».",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente no necesita esta lista.
  interna: true,
  input: z.object({ dispositivoId: uuidSchema }),
  output: z.object({
    items: z.array(
      z.object({ id: z.string(), nombre: z.string(), iniciales: z.string(), cargo: z.string().nullable() }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((p) => p.id),
  async handler(ctx, { dispositivoId }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    const vinculos = await ctx.db.vinculoLaboral.findMany({
      where: {
        instalacionId: disp.instalacionId,
        estado: "vigente",
        persona: { archivadaEn: null, anonimizadaEn: null },
      },
      select: {
        persona: { select: { id: true, nombres: true, apellidos: true } },
        cargo: { select: { nombre: true } },
      },
      orderBy: { persona: { apellidos: "asc" } },
      take: 200,
    });
    const vistas = new Set<string>();
    const items = vinculos.flatMap((v) => {
      if (vistas.has(v.persona.id)) return [];
      vistas.add(v.persona.id);
      const { id, nombres, apellidos } = v.persona;
      const iniciales = `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
      return [{ id, nombre: `${nombres} ${apellidos}`.trim(), iniciales, cargo: v.cargo.nombre }];
    });
    return { items };
  },
});

export const hechosListar = defineCapability({
  id: "core.hechos_terreno.listar",
  descripcion:
    "Lista los hechos que los equipos de terreno enviaron para una instalación, del más reciente al más antiguo, con su tipo, hora corregida y desfase del reloj. No muestra el contenido de cada hecho.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({
    instalacionId: uuidSchema,
    tipo: z.string().min(1).max(80).optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        tipo: z.string(),
        dispositivoId: z.string(),
        personaId: z.string().nullable(),
        horaCorregida: z.string(),
        recibidoEn: z.string(),
        desfaseSegundos: z.number().int(),
        desfaseAlto: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((h) => h.id),
  async handler(ctx, { instalacionId, tipo, limite }) {
    const i = await ctx.db.instalacion.findFirst({
      where: { id: instalacionId, ...dondeInstalacion(ctx) },
      select: { id: true },
    });
    if (!i) throw noEncontrado("La instalación");
    const filas = await ctx.db.hechoTerreno.findMany({
      where: { instalacionId, ...(tipo ? { tipo } : {}) },
      orderBy: { horaCorregida: "desc" },
      take: limite,
    });
    return {
      items: filas.map((h) => ({
        id: h.id,
        tipo: h.tipo,
        dispositivoId: h.dispositivoId,
        personaId: h.personaId,
        horaCorregida: iso(h.horaCorregida),
        recibidoEn: iso(h.recibidoEn),
        desfaseSegundos: h.desfaseSegundos,
        desfaseAlto: h.desfaseAlto,
      })),
    };
  },
});
