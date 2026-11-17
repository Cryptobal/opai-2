// Slack F4 (CAR-294), revisión: dos personas aprietan «Tomar» a la vez (solo una gana) y los botones
// funcionan para un supervisor que solo tiene el portal de supervisor.
import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  limpiarTrabajos,
  registrarCapacidades,
  registrarTrabajos,
  trabajosDelNucleo,
} from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";

const T = TENANT_DE_PRUEBA;
const INST = "0192f3a0-0000-7000-8000-000000000c01";
const AVISO = "0192f3a0-0000-7000-8000-000000000e01";
const OTRO = "0192f3a0-0000-7000-8000-0000000000b9";
const semilla = (extra: Record<string, unknown> = {}) => ({
  tenant: [{ id: T, timezone: "America/Santiago" }],
  instalacion: [{ id: INST, tenantId: T, nombre: "Bodega Norte" }],
  slackAviso: [
    {
      id: AVISO,
      tenantId: T,
      tipo: "panico",
      clave: "panico:1",
      instalacionId: INST,
      personaId: null,
      titulo: "Pánico",
      detalle: null,
      enlace: null,
      canalId: "C0GENERAL1",
      hiloTs: "1.000100",
      ts: "1.000200",
      envio: "enviado",
      gestion: "abierto",
      tomadoPor: null,
      tomadoEn: null,
      cerradoPor: null,
      cerradoEn: null,
      createdAt: new Date(),
      ...extra,
    },
  ],
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarTrabajos();
  registrarTrabajos(trabajosDelNucleo);
});

describe("Slack F4: tomar en carrera y portal de supervisor", () => {
  it("si otra persona lo tomó entre la lectura y la escritura, no se pisa ni se emite evento", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla({ gestion: "tomado", tomadoPor: OTRO }) });
    // Simula la carrera: la lectura inicial ve el aviso todavía abierto.
    const delegado = ctx.db.slackAviso;
    const leer = delegado.findUnique.bind(delegado);
    Object.assign(delegado, {
      findUnique: async (args: Parameters<typeof leer>[0]) => {
        const f = await leer(args);
        return f ? { ...f, gestion: "abierto", tomadoPor: null } : f;
      },
    });
    const r = await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO });
    expect(r).toMatchObject({ ok: false, error: { message: "Otra persona ya tomó este aviso." } });
    expect(await ctx.db.slackAviso.findFirst({})).toMatchObject({ tomadoPor: OTRO });
    expect(await ctx.db.trabajo.count({ where: { tipo: "core.slack.aviso_actualizar" } })).toBe(0);
  });

  it("un supervisor con solo el portal de supervisor puede tomar y listar", async () => {
    const { ctx } = contextoDePrueba({
      rol: "supervisor",
      portal: "supervisor",
      portalesMembresia: ["supervisor"],
      alcance: { instalaciones: [INST] },
      semilla: semilla(),
    });
    expect(
      await executeCapability(ctx, "core.avisos_terreno.tomar", { avisoId: AVISO }),
    ).toMatchObject({ ok: true, data: { gestion: "tomado" } });
    expect(await executeCapability(ctx, "core.avisos_terreno.list", {})).toMatchObject({
      ok: true,
    });
  });

  it("pedir refuerzo dos veces seguidas encola un solo aviso al grupo", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    await executeCapability(ctx, "core.avisos_terreno.pedir_refuerzo", { avisoId: AVISO });
    await executeCapability(ctx, "core.avisos_terreno.pedir_refuerzo", { avisoId: AVISO });
    expect(await ctx.db.trabajo.count({ where: { tipo: "core.slack.aviso_refuerzo" } })).toBe(1);
  });
});
