import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, ctxComercial, etapaId, reiniciarComercial } from "./comercial-ayuda";

beforeEach(reiniciarComercial);

async function crear(ctx: Parameters<typeof dato>[0]) {
  return dato<{ id: string; estado: string; etapaId: string }>(ctx, "comercial.negocios.create", {
    cuentaId: CU,
    titulo: "Guardias · Planta 1",
  });
}

describe("comercial · negocios (create/mover/ganar)", () => {
  it("crea en la primera etapa, estado abierto, con historial", async () => {
    const { ctx, tabla } = ctxComercial();
    const n = await crear(ctx);
    expect(n.estado).toBe("abierto");
    expect(n.etapaId).toBe(etapaId(0));
    expect(tabla("negocioEtapas") ?? tabla("historialEtapa")).toBeDefined();
  });

  it("para salir de la primera etapa exige al menos una instalación (R10)", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    expect(await codigo(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(1) })).toBe(
      "UNPROCESSABLE",
    );
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    expect(await codigo(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(1) })).toBe(
      "OK",
    );
  });

  it("valida los requisitos de entrada de la etapa (R9)", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    // Etapa 3 exige monto y fecha de cierre.
    expect(await codigo(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(3) })).toBe(
      "UNPROCESSABLE",
    );
    await dato(ctx, "comercial.negocios.update", {
      id: n.id,
      montoEstimadoMensual: 2_000_000,
      cierreEstimado: "2026-12-01",
    });
    expect(await codigo(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(3) })).toBe(
      "OK",
    );
  });

  it("ganar (humano) avisa si no hay cotización y marca estado ganado", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    await dato(ctx, "comercial.negocios.update", {
      id: n.id,
      inicioServicioEstimado: "2026-12-15",
    });
    // R10: ganar también sale de la primera etapa, así que exige ≥1 instalación.
    expect(await codigo(ctx, "comercial.negocios.ganar", { id: n.id })).toBe("UNPROCESSABLE");
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    const r = await dato<{ estado: string; aviso: string | null }>(
      ctx,
      "comercial.negocios.ganar",
      { id: n.id },
    );
    expect(r.estado).toBe("ganado");
    expect(r.aviso).toMatch(/sin cotización/);
  });

  it("ganar lo pedido por un agente queda en aprobación humana", async () => {
    const { ctx } = ctxComercial();
    const n = await crear(ctx);
    await dato(ctx, "comercial.negocios.update", {
      id: n.id,
      inicioServicioEstimado: "2026-12-15",
    });
    const agente = ctxComercial({ actor: "agente" });
    // El agente reusa la misma base en memoria creando su propio negocio.
    const nAg = await crear(agente.ctx);
    await dato(agente.ctx, "comercial.negocios.update", {
      id: nAg.id,
      inicioServicioEstimado: "2026-12-15",
    });
    const r = await executeCapability(agente.ctx, "comercial.negocios.ganar", { id: nAg.id }, {});
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
  });
});
