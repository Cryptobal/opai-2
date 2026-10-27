import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { M2, semillaTenant } from "./semilla";

beforeEach(reiniciar);
const input = {
  nombre: "Servicio de prueba",
  tipo: "servicio",
  scopes: ["core"],
  permisos: ["core:cuentas.read"],
  presupuestoMensualUsd: 5,
};

describe("identidad de servicio", () => {
  it.each(["usuario", "servicio"])(
    "rechaza fracciones menores a micro-USD para %s antes del dryRun",
    async (tipo) => {
      const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
      for (const dryRun of [true, false]) {
        expect(
          await executeCapability(
            ctx,
            "core.apikeys.create",
            {
              nombre: "Presupuesto inválido",
              scopes: ["core"],
              tipo,
              permisos: ["core:cuentas.read"],
              presupuestoMensualUsd: 0.0000001,
            },
            { dryRun },
          ),
        ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
      }
    },
  );
  it("una key de owner no cambia el rol base ni promueve a owner (#60, review 5661003883)", async () => {
    const { ctx, tabla } = contextoDePrueba({
      semilla: semillaTenant("gerente"),
      rol: "owner",
      actor: { tipo: "agent", id: "key", viaUserId: "u" },
    });
    for (const rol of ["admin", "owner", "viewer"])
      expect(await codigo(ctx, "core.users.update", { membershipId: M2, rol })).toBe("FORBIDDEN");
    expect(tabla("membership").find((m) => m["id"] === M2)?.["rol"]).toBe("gerente");
  });
  it("crea con permisos explícitos y presupuesto; vista previa no escribe", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await executeCapability(ctx, "core.apikeys.create", input, { dryRun: true }),
    ).toMatchObject({
      ok: true,
      data: { tipo: "servicio", permisos: input.permisos, secreto: null },
    });
    expect(tabla("apiKey")).toHaveLength(0);
    const r = await dato(ctx, "core.apikeys.create", input);
    expect(r).toMatchObject({ tipo: "servicio", permisos: input.permisos });
    expect(tabla("apiKey")[0]).toMatchObject({
      principalTipo: "servicio",
      heredaPermisos: false,
      permisos: input.permisos,
      presupuestoMensualMicro: 5_000_000n,
    });
  });
  it("nadie concede a su key permisos o alcance que no tiene", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semillaTenant(),
      permisos: ["core:apikeys.manage", "core:agentes.manage"],
    });
    expect(await codigo(ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
    const limitado = contextoDePrueba({ semilla: semillaTenant(), alcance: { instalaciones: [] } });
    expect(await codigo(limitado.ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
  });
  it("servicio no hereda rol ni plataforma y soloPersonas sigue cerrado", async () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      actor: { tipo: "agent", id: "key", viaUserId: "u" },
      claveApi: { servicio: true, permisos: ["core:cuentas.read", "core:apikeys.manage"] },
    });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:users.manage")).toBe(false);
    expect(ctx.autorizar("platform:tenants.manage")).toBe(false);
    expect(await codigo(ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
  });
  it("H15: si el responsable baja de rol, la key de servicio pierde el permiso al vuelo", async () => {
    const actor = { tipo: "agent" as const, id: "key", viaUserId: "u" };
    const claveApi = { servicio: true, permisos: ["core:instalaciones.manage"] };
    const antes = contextoDePrueba({
      rol: null,
      actor,
      claveApi,
      accesoResponsable: { rol: "gerente", permisosRol: null, excepciones: null },
    }).ctx;
    expect(antes.autorizar("core:instalaciones.manage")).toBe(true);
    // El mismo responsable, ya bajado a viewer: la key lista el permiso igual, pero el techo lo frena.
    const despues = contextoDePrueba({
      rol: null,
      actor,
      claveApi,
      accesoResponsable: { rol: "viewer", permisosRol: null, excepciones: null },
    }).ctx;
    expect(despues.autorizar("core:instalaciones.manage")).toBe(false);
  });
  it("H15: una excepción que deniega al responsable también cierra la key de servicio", async () => {
    const actor = { tipo: "agent" as const, id: "key", viaUserId: "u" };
    const claveApi = { servicio: true, permisos: ["core:instalaciones.manage"] };
    const { ctx } = contextoDePrueba({
      rol: null,
      actor,
      claveApi,
      accesoResponsable: {
        rol: "gerente",
        permisosRol: null,
        excepciones: [{ permiso: "core:instalaciones.manage", conceder: false }],
      },
    });
    expect(ctx.autorizar("core:instalaciones.manage")).toBe(false);
  });
  it("ctx.plataforma es null para cualquier agente, aunque el responsable tenga platformRole", async () => {
    const usuario = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
    const { ctx } = contextoDePrueba({
      rol: "owner",
      usuario,
      actor: { tipo: "agent", id: "key", viaUserId: usuario.id },
      claveApi: { servicio: false, permisos: null },
    });
    expect(ctx.plataforma).toBeNull();
  });
  it("exige presupuesto y permisos explícitos también al actualizar", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await codigo(ctx, "core.apikeys.create", { ...input, presupuestoMensualUsd: undefined }),
    ).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.apikeys.create", { ...input, permisos: undefined })).toBe(
      "UNPROCESSABLE",
    );
    expect(
      (await executeCapability(ctx, "core.apikeys.create", { ...input, permisos: [] })).ok,
    ).toBe(false);
    const { id } = await dato<{ id: string }>(ctx, "core.apikeys.create", input);
    for (const presupuestoMensualUsd of [0, null])
      expect(await codigo(ctx, "core.apikeys.update", { id, presupuestoMensualUsd })).toBe(
        "UNPROCESSABLE",
      );
  });
});
