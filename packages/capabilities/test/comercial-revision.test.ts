import { beforeEach, describe, expect, it } from "vitest";

import { aplicarEtapa } from "../src/comercial/transiciones-util";
import { codigo, dato } from "./maestros-ayuda";
import { CU, I1, I2, K1, K2, ctxComercial, etapaId, reiniciarComercial } from "./comercial-ayuda";

// Correcciones de la revisión del PR #97: alcance de contactos (B1), configuración solo para owner
// y admin (B2) y transiciones condicionadas a la etapa leída (carrera mover/ganar).
beforeEach(reiniciarComercial);

const lectura = ["comercial:negocios.read", "core:cuentas.read"];
type Lista = { items: { id: string }[] };

describe("comercial · correcciones de la revisión", () => {
  it("la lista de contactos respeta el alcance por instalaciones (ADR-022)", async () => {
    const fuera = ctxComercial({ permisos: lectura, alcance: { instalaciones: [I2] } });
    const ninguno = await dato<Lista>(fuera.ctx, "comercial.contactos.list", {});
    expect(ninguno.items).toEqual([]);

    const vacio = ctxComercial({ permisos: lectura, alcance: { instalaciones: [] } });
    expect((await dato<Lista>(vacio.ctx, "comercial.contactos.list", {})).items).toEqual([]);

    const dentro = ctxComercial({ permisos: lectura, alcance: { instalaciones: [I1] } });
    const visibles = await dato<Lista>(dentro.ctx, "comercial.contactos.list", {});
    expect(visibles.items.map((c) => c.id).sort()).toEqual([K1, K2].sort());
  });

  it("solo owner y admin configuran el embudo y los catálogos; gerente no", async () => {
    const etapa = { id: etapaId(1), nombre: "Calificado B" };
    const catalogo = { catalogo: "origen", nombre: "Referido" };
    for (const rol of ["owner", "admin"] as const) {
      const { ctx } = ctxComercial({ rol });
      expect(await codigo(ctx, "comercial.config.actualizar_etapa", etapa)).toBe("OK");
      expect(await codigo(ctx, "comercial.config.guardar_catalogo", catalogo)).toBe("OK");
    }
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const { ctx } = ctxComercial({ rol });
      expect(await codigo(ctx, "comercial.config.actualizar_etapa", etapa)).toBe("FORBIDDEN");
      expect(await codigo(ctx, "comercial.config.guardar_catalogo", catalogo)).toBe("FORBIDDEN");
    }
  });

  it("una transición con la etapa ya cambiada responde CONFLICT y no pisa el negocio", async () => {
    const { ctx, tabla } = ctxComercial();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      cuentaId: CU,
      titulo: "Guardias · Planta 1",
    });
    await dato(ctx, "comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: I1,
      tipo: "nueva",
    });
    const leido = tabla("negocio")?.find((f) => f.id === n.id);
    if (!leido) throw new Error("sin negocio");
    const foto = {
      id: n.id,
      etapaId: String(leido.etapaId),
      estado: String(leido.estado),
      createdAt: leido.createdAt as Date,
    };
    // Otra transición (p. ej. un mover) gana la carrera y cambia la etapa.
    await dato(ctx, "comercial.negocios.mover", { id: n.id, etapaId: etapaId(1) });
    const ganada = { id: etapaId(6), tipo: "ganada" };
    await expect(
      ctx.transaccion((tx) =>
        aplicarEtapa(ctx, tx, foto, ganada, {
          evento: "comercial.negocio.ganado",
          datos: { ganadoEn: new Date() },
        }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const despues = tabla("negocio")?.find((f) => f.id === n.id);
    expect(despues).toMatchObject({ etapaId: etapaId(1), estado: "abierto" });
    expect(despues?.ganadoEn ?? null).toBeNull();
  });
});
