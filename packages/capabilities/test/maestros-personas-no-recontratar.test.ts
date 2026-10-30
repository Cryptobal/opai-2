import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const maria = { nombres: "María Fernanda", apellidos: "Soto", rut: "16.234.567-2" };

describe("core.personas.*no_recontratar* (P1, RRHH/admin)", () => {
  it("marca, se ve y se puede quitar con motivo; dryRun no persiste", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);

    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
      motivo: null,
    });

    expect(await codigo(ctx, "core.personas.marcar_no_recontratar", { id, motivo: "x" })).toBe(
      "INVALID_INPUT",
    );

    const vista = await dato(
      ctx,
      "core.personas.marcar_no_recontratar",
      { id, motivo: "Abandono de turno sin aviso" },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ activa: true });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
    });

    await dato(ctx, "core.personas.marcar_no_recontratar", {
      id,
      motivo: "Abandono de turno sin aviso",
    });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: true,
      motivo: "Abandono de turno sin aviso",
      marcadaEn: expect.any(String),
    });

    await dato(ctx, "core.personas.quitar_no_recontratar", {
      id,
      motivo: "Se verificó que fue un error administrativo",
    });
    expect(await dato(ctx, "core.personas.no_recontratar_ver", { id })).toMatchObject({
      activa: false,
      motivo: null,
      marcadaEn: null,
    });
  });

  it("queda en la auditoría (eventos), nunca en texto plano fuera de la capacidad", async () => {
    const { ctx, eventos } = contextoDePrueba({ rol: "admin" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", maria);
    await dato(ctx, "core.personas.marcar_no_recontratar", { id, motivo: "Hurto comprobado" });
    expect(eventos.at(-1)).toMatchObject({ capability: "core.personas.marcar_no_recontratar" });
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
      await codigo(ctx, "core.personas.marcar_no_recontratar", { id: idAjeno, motivo: "x".repeat(10) }),
    ).toBe("NOT_FOUND");
  });
});
