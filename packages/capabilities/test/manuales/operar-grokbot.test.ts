// Escenario determinista del manual docs/2.0/agentes/operar-grokbot.md (ADR-034): la misma
// secuencia de herramientas MCP que describe, contra el contexto de prueba. Si una herramienta
// nombrada en el manual no existe o cambia de forma, falla.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo, limpiarRegistro, MANUALES, registrarCapacidades } from "../../src";
import { capacidadesComercial } from "../../src/comercial";
import { capacidadesFinanzas } from "../../src/finanzas";
import { ejecutarHerramienta, herramientasMcp } from "../../src/mcp";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../../src/testing";
import type { Contexto } from "../../src/types";
import { CU, N1, semillaComercial } from "../comercial-ayuda";
import { registrarModuloComercial } from "../comercial-modulo";
import { limpiarModulos } from "../../src/module";

const RUTA = new URL("../../../../docs/2.0/agentes/operar-grokbot.md", import.meta.url);
const SNAPSHOT = new URL("../__snapshots__/herramientas-mcp.txt", import.meta.url);
const KEY = "0192f3a0-0000-7000-8000-00000000c0de";
const DOC = "0192f3a0-0000-7000-8000-0000000000ee";

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesComercial, ...capacidadesFinanzas]);
  registrarModuloComercial();
});

/** Key de servicio con permisos explícitos (perfil de lectura y escritura del manual). */
function bot() {
  const comercial = semillaComercial({ conNegocio: true });
  return contextoDePrueba({
    semilla: {
      ...comercial,
      tenant: [{ ...comercial.tenant[0]!, timezone: "America/Santiago" }],
      apiKey: [
        {
          id: KEY,
          nombre: "Grokbot",
          userId: USUARIO_DE_PRUEBA.id,
          scopes: ["core", "comercial", "finanzas"],
        },
      ],
      documentoEmitido: [],
      documentoRecibido: [],
    },
    modulosActivos: ["comercial", "finanzas"],
    actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
    scopes: ["core", "comercial", "finanzas"],
    agente: { apiKeyId: KEY, nombre: "Grokbot", presupuestoMensualMicro: null, autonomia: {} },
    permisos: [
      "core:cuentas.read",
      "core:actividades.read",
      "comercial:negocios.read",
      "comercial:negocios.manage",
      "finanzas:read",
      "finanzas:ventas.manage",
    ],
  });
}

async function usar(ctx: Contexto, nombre: string, args: unknown) {
  const h = herramientasMcp(ctx).find((x) => x.nombre === nombre);
  if (!h) throw new Error(`El manual nombra "${nombre}" y no existe para el agente.`);
  return ejecutarHerramienta(ctx, h, args);
}

describe("manual operar-grokbot", () => {
  it("la copia servida por MCP es idéntica al documento", () => {
    const m = MANUALES.find((x) => x.id === "operar-grokbot");
    expect(m?.texto).toBe(readFileSync(RUTA, "utf8"));
  });

  it("toda herramienta nombrada en el manual existe en la instantánea de herramientas", () => {
    const nombradas = [
      ...readFileSync(RUTA, "utf8").matchAll(
        /`((?:preview_)?(?:core|comercial|cpq|finanzas)_[a-z_]+)`/g,
      ),
    ].map((m) => m[1] ?? "");
    const existentes = new Set(readFileSync(SNAPSHOT, "utf8").split("\n"));
    expect(nombradas.length).toBeGreaterThan(40);
    expect(nombradas.filter((n) => !existentes.has(n))).toEqual([]);
  });

  it("las seis herramientas nuevas del brief están en la instantánea y las ve la key del bot", () => {
    const { ctx } = bot();
    const visibles = new Set(herramientasMcp(ctx).map((h) => h.nombre));
    for (const n of [
      "comercial_informes_perdidos_por_motivo",
      "comercial_informes_cierre",
      "comercial_negocios_alertas",
      "finanzas_reportes_resultados",
      "finanzas_ventas_buscar",
      "core_indicadores_uf_utm",
    ]) {
      expect(visibles.has(n), n).toBe(true);
    }
  });

  it("recorre la secuencia de lectura del manual", async () => {
    const { ctx } = bot();
    const yo = await usar(ctx, "core_me", {});
    expect(yo).toMatchObject({ ok: true, data: { agente: { nombre: "Grokbot" } } });
    expect(await usar(ctx, "core_indicadores_uf_utm", {})).toMatchObject({
      ok: true,
      data: { uf: null },
    });
    expect(await usar(ctx, "comercial_negocios_embudo", {})).toMatchObject({ ok: true });
    expect(await usar(ctx, "comercial_negocios_alertas", {})).toMatchObject({
      ok: true,
      data: { inactividadEvaluada: true, total: 1 },
    });
    expect(await usar(ctx, "comercial_informes_cierre", { agruparPor: "origen" })).toMatchObject({
      ok: true,
      data: { ganados: 0, pipelineAbierto: { cantidad: 1 } },
    });
    expect(await usar(ctx, "comercial_informes_perdidos_por_motivo", {})).toMatchObject({
      ok: true,
      data: { totalPerdidos: 0 },
    });
    expect(
      await usar(ctx, "finanzas_reportes_resultados", { desde: "2026-09", hasta: "2026-10" }),
    ).toMatchObject({
      ok: true,
      data: { totales: { resultadoClp: 0 } },
    });
    expect(await usar(ctx, "finanzas_ventas_buscar", { rut: "76.543.210-3" })).toMatchObject({
      ok: true,
      data: { items: [] },
    });
  });

  it("escribe con vista previa e idempotencia, y lo irreversible queda en aprobación humana", async () => {
    const { ctx, tabla } = bot();
    const nuevo = { cuentaId: CU, titulo: "Guardias · Planta 2" };
    expect(await usar(ctx, "preview_comercial_negocios_create", nuevo)).toMatchObject({
      ok: true,
      dryRun: true,
    });
    expect(tabla("negocio")).toHaveLength(1);
    await usar(ctx, "comercial_negocios_create", { ...nuevo, idempotency_key: "bot-negocio-001" });
    expect(
      await usar(ctx, "comercial_negocios_create", {
        ...nuevo,
        idempotency_key: "bot-negocio-001",
      }),
    ).toMatchObject({
      ok: true,
      repetida: true,
    });
    expect(tabla("negocio")).toHaveLength(2);
    const ganar = await usar(ctx, "comercial_negocios_ganar", {
      id: N1,
      idempotency_key: "bot-ganar-001",
    });
    expect(ganar).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    const emitir = await usar(ctx, "finanzas_ventas_emitir", {
      documentoId: DOC,
      idempotency_key: "bot-emitir-001",
    });
    expect(emitir).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
  });
});
