import { beforeEach, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { destinoVinculo } from "./vinculo-fixture";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba({ rol: "admin" });
  const { id: cargoId } = await dato<{ id: string }>(p.ctx, "core.cargos.create", {
    nombre: "Guardia",
  });
  return { ...p, cargoId };
}

const postulante = { nombres: "Tina", apellidos: "Mora", rut: "17.456.789-1", estadoInicial: "postulante" as const };

describe("cambios de estado implícitos (CAR-674, B1)", () => {
  it("core.vinculos.create no activa a rechazada ni bloqueada permanente", async () => {
    const { ctx, cargoId } = await base();
    const rech = await dato<{ id: string }>(ctx, "core.personas.create", postulante);
    await dato(ctx, "core.personas.rechazar", { id: rech.id, motivo: "No cumple requisitos mínimos" });
    expect(
      await codigo(ctx, "core.vinculos.create", {
        personaId: rech.id,
        ...(await destinoVinculo(ctx)),
        cargoId,
        tipo: "indefinido",
        inicio: "2026-01-01",
      }),
    ).toBe("UNPROCESSABLE");

    const bloq = await dato<{ id: string }>(ctx, "core.personas.create", {
      ...postulante,
      rut: "15.432.876-9",
    });
    await dato(ctx, "core.personas.bloquear_permanente", {
      id: bloq.id,
      motivo: "Conducta grave documentada en expediente",
    });
    expect(
      await codigo(ctx, "core.vinculos.create", {
        personaId: bloq.id,
        ...(await destinoVinculo(ctx)),
        cargoId,
        tipo: "indefinido",
        inicio: "2026-01-01",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("core.personas.archive permite postulante y rechaza rechazada o bloqueo permanente", async () => {
    const { ctx } = contextoDePrueba({ rol: "gerente" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", postulante);
    await dato(ctx, "core.personas.archive", { id });
    const rech = await dato<{ id: string }>(ctx, "core.personas.create", {
      ...postulante,
      rut: "14.456.789-7",
    });
    await dato(ctx, "core.personas.rechazar", { id: rech.id, motivo: "No califica para el cargo" });
    expect(await codigo(ctx, "core.personas.archive", { id: rech.id })).toBe("UNPROCESSABLE");
  });

  it("con solo personasManage no puede sacar a nadie de rechazado por ningún camino", async () => {
    const { ctx: adminCtx, cargoId } = await base();
    const gerente = contextoDePrueba({
      rol: "gerente",
      permisos: [PERMISOS_CORE.personasManage, PERMISOS_CORE.personasRead],
    }).ctx;
    const rech = await dato<{ id: string }>(gerente, "core.personas.create", {
      ...postulante,
      rut: "13.333.444-0",
    });
    await dato(gerente, "core.personas.rechazar", { id: rech.id, motivo: "No cumple el perfil del puesto" });
    expect(await codigo(gerente, "core.personas.archive", { id: rech.id })).toBe("UNPROCESSABLE");
    expect(await codigo(gerente, "core.personas.activar", { id: rech.id, motivo: "Intento de activar" })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(gerente, "core.personas.reactivar", { id: rech.id, motivo: "Intento de reactivar" })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(gerente, "core.personas.contratar_externo", { id: rech.id, motivo: "Intento externo" })).toBe(
      "UNPROCESSABLE",
    );
    const vinculo = await codigo(gerente, "core.vinculos.create", {
      personaId: rech.id,
      ...(await destinoVinculo(adminCtx)),
      cargoId,
      tipo: "indefinido",
      inicio: "2026-01-01",
    });
    expect(["FORBIDDEN", "UNPROCESSABLE"]).toContain(vinculo);
    // Camino archive + reactivate (solo con postulante archivable, no desde rechazado).
    const post = await dato<{ id: string }>(gerente, "core.personas.create", {
      ...postulante,
      rut: "12.345.678-5",
    });
    await dato(gerente, "core.personas.rechazar", { id: post.id, motivo: "Tampoco cumple requisitos mínimos" });
    await gerente.db.persona.update({
      where: { id: post.id },
      data: { estado: "inactivo", archivadaEn: new Date("2026-01-15") },
    });
    expect(await codigo(gerente, "core.personas.reactivar", { id: post.id, motivo: "Bypass archivada" })).toBe(
      "UNPROCESSABLE",
    );
    expect(await codigo(gerente, "core.personas.activar", { id: post.id, motivo: "Bypass activar" })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("core.personas.archive rechaza bloqueo permanente", async () => {
    const admin = contextoDePrueba({
      rol: "gerente",
      permisos: [PERMISOS_CORE.personasManage, PERMISOS_CORE.personasEstadoAdmin],
    }).ctx;
    const { id } = await dato<{ id: string }>(admin, "core.personas.create", {
      ...postulante,
      rut: "12.345.678-5",
    });
    await dato(admin, "core.personas.bloquear_permanente", { id, motivo: "No cumple política de contratación" });
    expect(await codigo(admin, "core.personas.archive", { id })).toBe("UNPROCESSABLE");
  });

  it("core.vinculos.create dryRun falla si la persona está bloqueada operativamente", async () => {
    const { ctx, cargoId } = await base();
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", {
      ...postulante,
      rut: "13.333.444-0",
    });
    await dato(ctx, "core.personas.bloquear", { id, motivo: "Documentación pendiente de revisar" });
    expect(
      await codigo(ctx, "core.vinculos.create", {
        personaId: id,
        ...(await destinoVinculo(ctx)),
        cargoId,
        tipo: "indefinido",
        inicio: "2026-01-01",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("terminar el último vínculo no inactiva a bloqueada permanente", async () => {
    const { ctx, cargoId } = await base();
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", {
      nombres: "Luis",
      apellidos: "Pino",
      rut: "16.234.567-2",
    });
    const v = await dato<{ id: string }>(ctx, "core.vinculos.create", {
      personaId: id,
      ...(await destinoVinculo(ctx)),
      cargoId,
      tipo: "plazo_fijo",
      inicio: "2026-01-01",
      termino: "2026-06-30",
    });
    await ctx.db.persona.update({ where: { id }, data: { estado: "bloqueado_permanente" } });
    expect(
      await codigo(ctx, "core.vinculos.terminar", {
        id: v.id,
        termino: "2026-06-30",
        motivo: "Fin de contrato",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("solo admin bloquea de forma permanente", async () => {
    const gerente = contextoDePrueba({ rol: "gerente" }).ctx;
    const { id } = await dato<{ id: string }>(gerente, "core.personas.create", postulante);
    expect(
      await codigo(gerente, "core.personas.bloquear_permanente", {
        id,
        motivo: "Sin permiso estado.admin",
      }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(
        contextoDePrueba({
          rol: "gerente",
          permisos: [PERMISOS_CORE.personasManage, PERMISOS_CORE.personasRead],
        }).ctx,
        "core.personas.bloquear_permanente",
        { id, motivo: "Intento con solo personasManage" },
      ),
    ).toBe("FORBIDDEN");
  });
});