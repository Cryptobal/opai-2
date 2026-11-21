// CAR-528: «ver como». Solo owner y admin lo inician, dentro de su empresa, auditado en la cadena de
// seguridad; en «ver como» toda escritura falla en el servidor y las lecturas auditadas registran a quien mira.
import { z } from "zod";
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant, U2 } from "./semilla";

const P_BETO = "0192f3a0-0000-7000-8000-00000000c001";
const P_ANA = "0192f3a0-0000-7000-8000-00000000c002";
const P_SIN_USUARIO = "0192f3a0-0000-7000-8000-00000000c003";
const ANA = USUARIO_DE_PRUEBA.id;
const BETO = { id: U2, nombre: "Beto", email: "beto@prueba.cl", platformRole: null };

const escribir = defineCapability({
  id: "core.prueba_ver_como.escribir",
  descripcion: "Escritura de prueba para comprobar el bloqueo de «ver como». Acepta vista previa.",
  permiso: null,
  input: z.object({}),
  output: z.object({ hecho: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  handler: async () => ({ hecho: true }),
});

const leer = defineCapability({
  id: "core.prueba_ver_como.leer",
  descripcion: "Lectura auditada de prueba para comprobar que registra a quien mira en «ver como».",
  permiso: null,
  input: z.object({}),
  output: z.object({ id: z.string() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  handler: async () => ({ id: P_BETO }),
});

const exportar = defineCapability({ ...leer, id: "core.prueba_ver_como.exportar" });

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, escribir, leer, exportar]);
});

function semilla() {
  const s = semillaTenant("admin");
  const persona = (id: string, usuarioId: string | null, nombres: string) => ({
    id,
    tenantId: TENANT_DE_PRUEBA,
    nombres,
    apellidos: "Prueba",
    estado: "activo",
    usuarioId,
    archivadaEn: null,
    anonimizadaEn: null,
  });
  return {
    ...s,
    membership: s.membership.map((m) => ({ ...m, portales: ["erp", "trabajador"] })),
    persona: [
      persona(P_BETO, U2, "Beto"),
      persona(P_ANA, ANA, "Ana"),
      persona(P_SIN_USUARIO, null, "Caro"),
    ],
  };
}

const ctxDe = (o: Parameters<typeof contextoDePrueba>[0] = {}) =>
  contextoDePrueba({ semilla: semilla(), modulosActivos: ["portal_trabajador"], ...o });
const iniciar = (objetivoId = P_BETO) => ({ portal: "trabajador", objetivoId });

describe("core.ver_como.iniciar", () => {
  it("el owner inicia: devuelve a quién se verá y deja el inicio en la cadena de seguridad", async () => {
    const { ctx, tabla } = ctxDe();
    const r = await executeCapability(ctx, "core.ver_como.iniciar", iniciar());
    expect(r).toMatchObject({
      ok: true,
      data: { userId: U2, nombre: "Beto Prueba", dispositivoId: null },
    });
    expect(tabla("auditoriaSeguridad")).toMatchObject([
      { tipo: "seguridad.ver_como.inicio", userId: U2, porUserId: ANA, tenantId: TENANT_DE_PRUEBA },
    ]);
  });

  it("la vista previa no registra nada", async () => {
    const { ctx, tabla } = ctxDe();
    const r = await executeCapability(ctx, "core.ver_como.iniciar", iniciar(), { dryRun: true });
    expect(r.ok).toBe(true);
    expect(tabla("auditoriaSeguridad")).toHaveLength(0);
  });

  it("un no-admin (gerente, supervisor, lector) no puede iniciarlo", async () => {
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const { ctx, tabla } = ctxDe({ rol });
      const r = await executeCapability(ctx, "core.ver_como.iniciar", iniciar());
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(tabla("auditoriaSeguridad")).toHaveLength(0);
    }
  });

  it("un admin no ve como el owner, ni nadie como sí mismo", async () => {
    const admin = ctxDe({ rol: "admin", usuario: BETO });
    const r = await executeCapability(admin.ctx, "core.ver_como.iniciar", iniciar(P_ANA));
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const yo = await executeCapability(ctxDe().ctx, "core.ver_como.iniciar", iniciar(P_ANA));
    expect(yo.ok).toBe(false);
  });

  it("una API key, un actor con alcance acotado o una persona sin usuario: no", async () => {
    const agente = ctxDe({
      actor: { tipo: "agent", id: "k-1", viaUserId: ANA },
      agente: { apiKeyId: "k-1", nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
    });
    expect((await executeCapability(agente.ctx, "core.ver_como.iniciar", iniciar())).ok).toBe(
      false,
    );
    const acotado = ctxDe({ alcance: { instalaciones: [] } });
    expect(await executeCapability(acotado.ctx, "core.ver_como.iniciar", iniciar())).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    const sinUsuario = await executeCapability(
      ctxDe().ctx,
      "core.ver_como.iniciar",
      iniciar(P_SIN_USUARIO),
    );
    expect(sinUsuario).toMatchObject({
      ok: true,
      data: { userId: null, personaId: P_SIN_USUARIO, nombre: "Caro Prueba" },
    });
  });

  it("terminar deja el fin en la cadena de seguridad", async () => {
    const { ctx, tabla } = ctxDe();
    const r = await executeCapability(ctx, "core.ver_como.terminar", iniciar());
    expect(r).toMatchObject({ ok: true, data: { terminado: true } });
    expect(tabla("auditoriaSeguridad")).toMatchObject([
      { tipo: "seguridad.ver_como.fin", porUserId: ANA },
    ]);
  });
});

describe("contexto en «ver como»", () => {
  it("toda escritura falla en el servidor, también en vista previa", async () => {
    const { ctx } = ctxDe({ usuario: BETO, rol: "admin" });
    ctx.verComo = { porUserId: ANA };
    for (const dryRun of [false, true]) {
      const r = await executeCapability(ctx, "core.prueba_ver_como.escribir", {}, { dryRun });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("exportar tampoco: una portabilidad quedaría a nombre de la persona vista", async () => {
    const { ctx } = ctxDe({ usuario: BETO, rol: "admin" });
    ctx.verComo = { porUserId: ANA };
    expect(await executeCapability(ctx, "core.prueba_ver_como.exportar", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("las lecturas siguen y la auditoría registra a quien mira", async () => {
    const { ctx, eventos } = ctxDe({ usuario: BETO, rol: "admin" });
    ctx.verComo = { porUserId: ANA };
    expect(await executeCapability(ctx, "core.prueba_ver_como.leer", {})).toMatchObject({
      ok: true,
    });
    expect(eventos.find((e) => e.capability === "core.prueba_ver_como.leer")).toMatchObject({
      payload: { ids: [P_BETO], verComoPor: ANA },
    });
  });
});
