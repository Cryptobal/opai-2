// Bloqueo del Revisor en el PR 10.1 (R59): la auditoría de `cpq.*` guarda el input completo, así que
// el historial (panel de actividad, `core.audit.list` y su herramienta MCP) redacta los campos de
// costo y margen de la lista central a quien no tiene `cpq:costos.ver`, como el Inspector DT.
import { beforeEach, describe, expect, it } from "vitest";

import { CAMPOS_COSTO_CPQ, executeCapability } from "../src";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { USUARIO_DE_PRUEBA } from "../src/testing";
import { CARGO, N1, ctxCpq, registrarCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

// Valores reconocibles en el JSON: si alguno aparece, el costo se filtró.
const VALORES = ["654321", "1234567", "111111", "222222", "Motivo secreto de dotación"];
const agente = { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id };

/** El owner crea y ajusta una cotización con todos los campos de costo; deja su auditoría real. */
async function auditada() {
  const p = ctxCpq();
  const c = await executeCapability(p.ctx, "cpq.cotizaciones.create", {
    negocioId: N1,
    modoMargen: "markup",
    margenObjetivo: 111_111,
  });
  if (!c.ok) throw new Error(JSON.stringify(c.error));
  const d = c.data as { id: string; secciones: { id: string }[] };
  const a = await executeCapability(p.ctx, "cpq.cotizaciones.ajustar", {
    id: d.id,
    operaciones: [
      { op: "fijar_margen", margenObjetivo: 222_222 },
      {
        op: "agregar_linea",
        seccionId: d.secciones[0]?.id,
        tipo: "puesto",
        nombre: "Guardia",
        cargoId: CARGO,
        sueldoBruto: 654_321,
        costoUnitario: 1_234_567,
        margenPropio: 111_111,
        personasPorPosicion: 200,
        motivoPersonas: "Motivo secreto de dotación",
      },
    ],
  });
  if (!a.ok) throw new Error(JSON.stringify(a.error));
  return p.ctx;
}

type Ctx = Awaited<ReturnType<typeof auditada>>;
const inspector = (ctx: Ctx): Ctx => ({
  ...ctx,
  autorizar: (p: string) => p === "core:audit.read",
});
const conCostos = (ctx: Ctx): Ctx => ({
  ...ctx,
  autorizar: (p: string) => p === "core:audit.read" || p === "cpq:costos.ver",
});

async function lecturas(ctx: Ctx) {
  const panel = await executeCapability(ctx, "core.actividad.list", {});
  const consultas = await executeCapability(ctx, "core.audit.list", {});
  const ctxAgente = { ...ctx, actor: agente, scopes: ["*"] };
  const h = herramientasMcp(ctxAgente).find((x) => x.nombre === "core_audit_list");
  if (!h) throw new Error("falta la herramienta core_audit_list");
  const mcp = await ejecutarHerramienta(ctxAgente, h, {});
  return { panel, consultas, mcp };
}

describe("R59: la auditoría de CPQ no revela costos sin cpq:costos.ver", () => {
  it("el Inspector DT (core:audit.read sin cpq:costos.ver) los ve redactados en panel, consultas y MCP", async () => {
    const ctx = await auditada();
    for (const [via, r] of Object.entries(await lecturas(inspector(ctx)))) {
      expect(r.ok, via).toBe(true);
      const json = JSON.stringify(r.ok && r.data);
      expect(json, via).toContain("cpq.cotizaciones.ajustar");
      expect(json, via).toContain("••••");
      for (const v of VALORES) expect(json, `${via}: ${v}`).not.toContain(v);
      expect(json, via).not.toContain('"markup"');
    }
  });

  it("quien tiene cpq:costos.ver sí los ve en panel, consultas y MCP", async () => {
    const ctx = await auditada();
    for (const [via, r] of Object.entries(await lecturas(conCostos(ctx)))) {
      expect(r.ok, via).toBe(true);
      const json = JSON.stringify(r.ok && r.data);
      for (const v of VALORES) expect(json, `${via}: ${v}`).toContain(v);
      expect(json, via).toContain('"markup"');
    }
  });

  it("la lista central cubre los campos que las vistas omiten sin el permiso", () => {
    expect([...CAMPOS_COSTO_CPQ].sort()).toEqual(
      [
        "costoMensual",
        "costoUnitario",
        "margenEfectivo",
        "margenObjetivo",
        "margenPropio",
        "modoMargen",
        "motivoPersonas",
        "sueldoBruto",
      ].sort(),
    );
  });
});
