import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { destinoVinculo } from "./vinculo-fixture";

beforeEach(reiniciar);

const maria = { nombres: "María Fernanda", apellidos: "Soto", rut: "16.234.567-2" };
const VENCE = "2030-01-01";

describe("core.personas.*no_recontratar* (P1, RRHH/admin)", () => {
  it("marca con vencimiento obligatorio, se ve y se puede quitar con motivo; dryRun no persiste", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);

    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
      motivo: null,
      venceEn: null,
    });

    expect(
      await codigo(ctx, "core.personas.marcar_no_recontratar", { id, motivo: "x", venceEn: VENCE }),
    ).toBe("INVALID_INPUT");
    // Sin venceEn: obligatorio.
    expect(
      await codigo(ctx, "core.personas.marcar_no_recontratar", {
        id,
        motivo: "Abandono de turno sin aviso",
      }),
    ).toBe("INVALID_INPUT");
    // Con venceEn en el pasado: inválido.
    expect(
      await codigo(ctx, "core.personas.marcar_no_recontratar", {
        id,
        motivo: "Abandono de turno sin aviso",
        venceEn: "2020-01-01",
      }),
    ).toBe("INVALID_INPUT");

    const vista = await dato(
      ctx,
      "core.personas.marcar_no_recontratar",
      { id, motivo: "Abandono de turno sin aviso", venceEn: VENCE },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ activa: true, venceEn: VENCE });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
    });

    await dato(ctx, "core.personas.marcar_no_recontratar", {
      id,
      motivo: "Abandono de turno sin aviso",
      venceEn: VENCE,
    });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: true,
      motivo: "Abandono de turno sin aviso",
      marcadaEn: expect.any(String),
      venceEn: VENCE,
    });

    await dato(ctx, "core.personas.quitar_no_recontratar", {
      id,
      motivo: "Se verificó que fue un error administrativo",
    });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
      motivo: null,
      marcadaEn: null,
      venceEn: null,
    });
  });

  it("el motivo nunca queda en claro en la auditoría, ni para quien tiene el permiso", async () => {
    const { ctx, eventos } = contextoDePrueba({ rol: "admin" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    await dato(ctx, "core.personas.marcar_no_recontratar", {
      id,
      motivo: "Abandono de turno",
      venceEn: VENCE,
    });
    const marcado = eventos.at(-1);
    expect(marcado).toMatchObject({ capability: "core.personas.marcar_no_recontratar" });
    const payload = marcado?.payload as { input?: { motivo?: string } } | undefined;
    expect(payload?.input?.motivo).toBe("[oculto]");

    await dato(ctx, "core.personas.quitar_no_recontratar", {
      id,
      motivo: "Se aclaró el malentendido",
    });
    const quitado = eventos.at(-1);
    const payloadQuitar = quitado?.payload as { input?: { motivo?: string } } | undefined;
    expect(payloadQuitar?.input?.motivo).toBe("[oculto]");
  });

  it.each(["gerente", "supervisor", "viewer"] as const)(
    "%s no tiene el permiso: ni ver ni marcar, con un id cualquiera",
    async (rol) => {
      const { ctx } = contextoDePrueba({ rol });
      const idCualquiera = "0192f3a0-0000-7000-8000-00000000ffff";
      expect(await codigo(ctx, "core.personas.no_recontratar_ver", { id: idCualquiera })).toBe(
        "FORBIDDEN",
      );
      expect(
        await codigo(ctx, "core.personas.marcar_no_recontratar", {
          id: idCualquiera,
          motivo: "Cualquiera",
          venceEn: VENCE,
        }),
      ).toBe("FORBIDDEN");
    },
  );

  it("no existe o fuera de tenant: NOT_FOUND, no CONFLICT ni 500", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const idAjeno = "0192f3a0-0000-7000-8000-00000000ffff";
    expect(await codigo(ctx, "core.personas.no_recontratar_ver", { id: idAjeno })).toBe(
      "NOT_FOUND",
    );
    expect(
      await codigo(ctx, "core.personas.marcar_no_recontratar", {
        id: idAjeno,
        motivo: "x".repeat(10),
        venceEn: VENCE,
      }),
    ).toBe("NOT_FOUND");
  });

  it("la marca nunca bloquea un alta nueva (art. 8° bis): solo es un aviso", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const { id: cargoId } = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Guardia",
    });
    const { id: personaId } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    await dato(ctx, "core.personas.marcar_no_recontratar", {
      id: personaId,
      motivo: "Abandono de turno",
      venceEn: VENCE,
    });
    expect(
      await codigo(ctx, "core.vinculos.create", {
        ...(await destinoVinculo(ctx)),
        personaId,
        cargoId,
        tipo: "indefinido",
        inicio: "2026-11-01",
      }),
    ).toBe("OK");
  });
});
