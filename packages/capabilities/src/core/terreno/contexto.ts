import { z } from "zod";

import { estadoDelTurno, ventanaDeTurnos } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dispositivoActivo, iso } from "./hechos-comun";

/** Módulos de terreno que el shell sabe mostrar. Cada uno aparece solo si la empresa lo tiene activo. */
const MODULOS_DE_TERRENO = ["asistencia", "rondas", "acceso"] as const;

const turnoVista = z.object({
  personaId: z.string(),
  nombre: z.string(),
  iniciales: z.string(),
  inicio: z.string(),
  fin: z.string(),
  estado: z.enum(["en_curso", "proximo", "terminado"]),
});

export const terrenoContexto = defineCapability({
  id: "core.terreno.contexto",
  descripcion:
    "Da al equipo de terreno emparejado su contexto de trabajo: la instalación, quién tiene turno ahora, quién entra después y qué módulos de terreno (Asistencia, Rondas, Control de acceso) tiene activos su empresa, para armar el inicio por instalación y turno.",
  permiso: null,
  // Interna: la lee el equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente consulta turnos con core.turnos.* y la instalación con core.instalaciones.get.
  interna: true,
  input: z.object({ dispositivoId: uuidSchema }),
  output: z.object({
    instalacion: z.object({ id: z.string(), nombre: z.string() }),
    ahora: z.string(),
    turnos: z.array(turnoVista),
    modulos: z.object({ asistencia: z.boolean(), rondas: z.boolean(), acceso: z.boolean() }),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.turnos.map((t) => t.personaId),
  async handler(ctx, { dispositivoId }) {
    const disp = await dispositivoActivo(ctx, dispositivoId);
    const ahora = new Date();
    const { desde, hasta } = ventanaDeTurnos(ahora);
    const [instalacion, filas] = await Promise.all([
      ctx.db.instalacion.findFirstOrThrow({
        where: { id: disp.instalacionId },
        select: { id: true, nombre: true },
      }),
      ctx.db.turnoEsperado.findMany({
        where: {
          instalacionId: disp.instalacionId,
          vigente: true,
          fin: { gt: desde },
          inicio: { lt: hasta },
        },
        select: {
          personaId: true,
          inicio: true,
          fin: true,
        },
        orderBy: [{ inicio: "asc" }, { personaId: "asc" }],
        take: 100,
      }),
    ]);
    // Solo personas vigentes (ni archivadas ni anonimizadas): sus nombres son los mismos de «¿Quién eres?».
    const personas = new Map(
      (
        await ctx.db.persona.findMany({
          where: {
            id: { in: [...new Set(filas.map((f) => f.personaId))] },
            archivadaEn: null,
            anonimizadaEn: null,
          },
          select: { id: true, nombres: true, apellidos: true },
        })
      ).map((p) => [p.id, p]),
    );
    const activos = new Set(ctx.modulosActivos);
    return {
      instalacion,
      ahora: iso(ahora),
      turnos: filas.flatMap((f) => {
        const p = personas.get(f.personaId);
        if (!p) return [];
        return [
          {
            personaId: f.personaId,
            nombre: `${p.nombres} ${p.apellidos}`.trim(),
            iniciales: `${p.nombres[0] ?? ""}${p.apellidos[0] ?? ""}`.toUpperCase(),
            inicio: iso(f.inicio),
            fin: iso(f.fin),
            estado: estadoDelTurno(f.inicio, f.fin, ahora),
          },
        ];
      }),
      modulos: Object.fromEntries(MODULOS_DE_TERRENO.map((m) => [m, activos.has(m)])) as {
        asistencia: boolean;
        rondas: boolean;
        acceso: boolean;
      },
    };
  },
});
