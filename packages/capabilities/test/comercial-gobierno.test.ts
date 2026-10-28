import { beforeEach, describe, expect, it } from "vitest";

import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, MP, ctxComercial, etapaId, reiniciarComercial } from "./comercial-ayuda";

// Brief 07 · PR 1 §7: autorización por rol, dryRun, idempotencia y reglas de cierre (R10, R20).
beforeEach(reiniciarComercial);

const nuevo = { cuentaId: CU, titulo: "Guardias · Planta 1" };

describe("comercial · gobierno de las capacidades", () => {
  it("owner, admin y gerente crean; supervisor y viewer no (permisos por rol)", async () => {
    for (const rol of ["owner", "admin", "gerente"] as const) {
      expect(await codigo(ctxComercial({ rol }).ctx, "comercial.negocios.create", nuevo)).toBe(
        "OK",
      );
    }
    for (const rol of ["supervisor", "viewer"] as const) {
      expect(await codigo(ctxComercial({ rol }).ctx, "comercial.negocios.create", nuevo)).toBe(
        "FORBIDDEN",
      );
    }
    expect(
      await codigo(ctxComercial({ rol: "supervisor" }).ctx, "comercial.negocios.list", {}),
    ).toBe("FORBIDDEN");
  });

  it("dryRun no escribe ni deja historial", async () => {
    const { ctx, tabla } = ctxComercial();
    await dato(ctx, "comercial.negocios.create", nuevo, { dryRun: true });
    expect(tabla("negocio") ?? []).toHaveLength(0);
    expect(tabla("historialEtapa") ?? []).toHaveLength(0);
  });

  it("la misma idempotencyKey no crea dos negocios", async () => {
    const { ctx, tabla } = ctxComercial();
    const a = await dato<{ id: string }>(ctx, "comercial.negocios.create", nuevo, {
      idempotencyKey: "neg-1",
    });
    const b = await dato<{ id: string }>(ctx, "comercial.negocios.create", nuevo, {
      idempotencyKey: "neg-1",
    });
    expect(b.id).toBe(a.id);
    expect(tabla("negocio")).toHaveLength(1);
  });

  it("un negocio perdido no se gana sin reabrirlo (R20)", async () => {
    const { ctx } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", nuevo);
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    await dato(ctx, "comercial.negocios.update", {
      id: n.id,
      inicioServicioEstimado: "2026-12-15",
    });
    await dato(ctx, "comercial.negocios.perder", { id: n.id, motivoPerdidaId: MP });
    expect(await codigo(ctx, "comercial.negocios.ganar", { id: n.id })).toBe("UNPROCESSABLE");
  });

  it("pasada la primera etapa no se quita la última instalación (R10)", async () => {
    const { ctx } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", nuevo);
    const vinculo = { negocioId: n.id, instalacionId: I1 };
    await dato(ctx, "comercial.negocios.vincular_instalacion", { ...vinculo, tipo: "nueva" });
    await dato(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(1) });
    expect(await codigo(ctx, "comercial.negocios.desvincular_instalacion", vinculo)).toBe(
      "UNPROCESSABLE",
    );
  });

  it("la lista de contactos exige además ver Cuentas (datos personales del núcleo)", async () => {
    const soloComercial = ctxComercial({ permisos: ["comercial:negocios.read"] });
    expect(await codigo(soloComercial.ctx, "comercial.contactos.list", {})).toBe("FORBIDDEN");
    const ambos = ctxComercial({ permisos: ["comercial:negocios.read", "core:cuentas.read"] });
    expect(await codigo(ambos.ctx, "comercial.contactos.list", {})).toBe("OK");
  });

  it("la configuración del embudo es solo de owner y admin (comercial.md §7)", async () => {
    const etapa = { id: etapaId(1), probabilidad: 25 };
    for (const rol of ["owner", "admin"] as const) {
      expect(
        await codigo(ctxComercial({ rol }).ctx, "comercial.config.actualizar_etapa", etapa),
      ).toBe("OK");
    }
    const gerente = ctxComercial({ rol: "gerente" }).ctx;
    expect(await codigo(gerente, "comercial.config.actualizar_etapa", etapa)).toBe("FORBIDDEN");
    expect(
      await codigo(gerente, "comercial.config.guardar_catalogo", {
        catalogo: "tipo",
        nombre: "Nuevo tipo",
      }),
    ).toBe("FORBIDDEN");
  });

  it("una transición rechaza si el negocio cambió de etapa entre la lectura y la escritura", async () => {
    const { ctx, tabla } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", nuevo);
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    // Simula otra petición que ya movió el negocio: la fila leída queda obsoleta.
    const { aplicarEtapa } = await import("../src/comercial/transiciones-util");
    const fila = tabla("negocio")?.[0] as { etapaId: string };
    const obsoleta = { id: n.id, etapaId: etapaId(0), estado: "abierto", createdAt: new Date() };
    fila.etapaId = etapaId(1);
    await expect(
      ctx.transaccion((tx) => aplicarEtapa(ctx, tx, obsoleta, { id: etapaId(2), tipo: "abierta" })),
    ).rejects.toThrow(/cambió de etapa/);
  });
});
