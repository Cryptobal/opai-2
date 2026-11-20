import { beforeEach, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const postulante = { nombres: "Pilar", apellidos: "Rivas", rut: "18.765.432-7" };

describe("core.personas.* (CAR-674)", () => {
  it("crear sin vínculo deja postulante; transiciones válidas e inválidas", async () => {
    const { ctx } = contextoDePrueba({ rol: "gerente" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", {
      ...postulante,
      estadoInicial: "postulante",
    });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({ estado: "postulante" });
    await dato(ctx, "core.personas.a_evaluacion", {
      id,
      motivo: "Entró a la instancia de evaluación",
    });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({ estado: "en_evaluacion" });
    await dato(ctx, "core.personas.marcar_externo", {
      id,
      motivo: "Quedará para turnos extra sin contrato",
    });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({ estado: "externo" });
    expect(
      await codigo(ctx, "core.personas.rechazar", {
        id,
        motivo: "No aplica desde externo",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("bloqueo permanente desde cualquier estado; no vuelve a activo sin admin", async () => {
    const { ctx } = contextoDePrueba({ rol: "admin" });
    const { id } = await dato<{ id: string }>(ctx, "core.personas.create", postulante);
    await dato(ctx, "core.personas.bloquear_permanente", {
      id,
      motivo: "Conducta grave documentada en expediente",
    });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({
      estado: "bloqueado_permanente",
    });
    expect(
      await codigo(ctx, "core.personas.reactivar", { id, motivo: "Intento indebido" }),
    ).toBe("UNPROCESSABLE");
    const gerente = contextoDePrueba({ rol: "gerente" }).ctx;
    expect(
      await codigo(gerente, "core.personas.desbloquear_permanente", {
        id,
        motivo: "Sin permiso admin",
      }),
    ).toBe("FORBIDDEN");
    await dato(ctx, "core.personas.desbloquear_permanente", {
      id,
      motivo: "Levantamiento acordado por dirección",
    });
    expect(await dato(ctx, "core.personas.get", { id })).toMatchObject({ estado: "inactivo" });
  });

  it("la key del bot reclutador no quita no recontratar ni desbloquea permanente", async () => {
    const base = contextoDePrueba({ rol: "admin" });
    const { id } = await dato<{ id: string }>(base.ctx, "core.personas.create", postulante);
    await dato(base.ctx, "core.personas.marcar_no_recontratar", {
      id,
      motivo: "Abandono de turno sin aviso",
      venceEn: "2031-06-01",
    });
    await dato(base.ctx, "core.personas.bloquear_permanente", {
      id,
      motivo: "No recontratable por fraude",
    });
    const reclutador = contextoDePrueba({
      rol: "gerente",
      permisos: [
        PERMISOS_CORE.personasManage,
        PERMISOS_CORE.personasRead,
        PERMISOS_CORE.personasLaboralManage,
        PERMISOS_CORE.personasLaboralRead,
        PERMISOS_CORE.documentosManage,
        PERMISOS_CORE.documentosRead,
        PERMISOS_CORE.personasNoRecontratarManage,
      ],
    }).ctx;
    expect(
      await codigo(reclutador, "core.personas.quitar_no_recontratar", {
        id,
        motivo: "Intento con permisos de reclutador",
      }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(reclutador, "core.personas.desbloquear_permanente", {
        id,
        motivo: "Intento con permisos de reclutador",
      }),
    ).toBe("FORBIDDEN");
  });

  it("fuera de tenant: NOT_FOUND", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner" });
    const idAjeno = "0192f3a0-0000-7000-8000-00000000ffff";
    expect(
      await codigo(ctx, "core.personas.a_evaluacion", { id: idAjeno, motivo: "x".repeat(10) }),
    ).toBe("NOT_FOUND");
  });
});