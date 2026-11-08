import { beforeEach, expect, it, vi } from "vitest";
import { contextoDePrueba } from "@opai/capabilities/testing";
import type * as Capacidades from "@opai/capabilities";
import { identidad } from "./revalidacion-fixture";

const { sesion, acceso, ajuste } = vi.hoisted(() => ({
  sesion: vi.fn(),
  acceso: vi.fn(),
  ajuste: vi.fn(),
}));
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<typeof Capacidades>()),
  ajuste,
}));
vi.mock("../lib/fuentes", () => ({ accesoConModulos: acceso, sesionEnTransaccion: sesion }));
vi.mock("../lib/mfa", () => ({ verificarMfaDe: async () => false }));
import { conectarRevalidacion } from "../lib/revalidacion-transaccion";

beforeEach(() => {
  vi.clearAllMocks();
  sesion.mockResolvedValue({ mfaActiva: true, mfaVerificada: true, platformRole: null });
  ajuste.mockResolvedValue(false);
});

function fixture() {
  const inicial = identidad();
  const actual = inicial.actual!;
  const { ctx } = contextoDePrueba({
    semilla: {
      membership: [{ ...actual, userId: inicial.usuario.id }],
      tenant: [actual.tenant],
    },
  });
  acceso.mockResolvedValue({
    acceso: inicial.acceso,
    modulosActivos: inicial.modulosActivos,
    modulosSoloLectura: [],
  });
  const leer = vi.fn(async () => ({ identidad: inicial, sesionId: "sesion-confiable" }));
  conectarRevalidacion(ctx, inicial, "erp", leer);
  return { ctx, inicial, leer };
}

it("sin lectura exterior autenticada no consulta la DB", async () => {
  const { ctx } = fixture();
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  expect(sesion).not.toHaveBeenCalled();
});

it("usa exclusivamente tx para sesión, permisos y ajuste MFA; conserva la huella", async () => {
  const { ctx, inicial, leer } = fixture();
  const hash = await ctx.revalidarAccesoSolicitud!();
  expect(await ctx.revalidarAccesoEnTransaccion!(ctx.db)).toBe(hash);
  expect(leer).toHaveBeenCalledTimes(1);
  expect(sesion.mock.calls[0]![0]).toBe(ctx.db);
  expect(sesion.mock.calls[0]!.slice(1)).toEqual(["sesion-confiable", inicial.usuario.id]);
  expect(acceso.mock.calls[0]![2]).toBe(ctx.db);
  expect(acceso.mock.calls[0]!.slice(0, 2)).toEqual([inicial.actual!.tenantId, inicial.usuario.id]);
  expect(ajuste.mock.calls[0]![0]).toBe(ctx);
  expect(ajuste.mock.calls[0]![3]).toBe(ctx.db);
});

it.each(["revocada", "mfa", "plataforma"])("rechaza sesión %s dentro de tx", async (caso) => {
  const { ctx } = fixture();
  await ctx.revalidarAccesoSolicitud!();
  sesion.mockResolvedValue(
    caso === "revocada"
      ? null
      : {
          mfaActiva: true,
          mfaVerificada: caso !== "mfa",
          platformRole: caso === "plataforma" ? "owner" : null,
        },
  );
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("no sustituye membresía borrada ni reutiliza permisos previos", async () => {
  const { ctx, inicial } = fixture();
  await ctx.revalidarAccesoSolicitud!();
  await ctx.db.membership.delete({ where: { id: inicial.actual!.id } });
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("una sesión nueva del mismo usuario no sustituye la sesión autenticada", async () => {
  const { ctx, inicial, leer } = fixture();
  await ctx.revalidarAccesoSolicitud!();
  leer.mockResolvedValue({ identidad: inicial, sesionId: "otra-sesion" });
  await expect(ctx.revalidarAccesoSolicitud!()).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("revalida permisos y propagación de errores sin recurrir al lector exterior", async () => {
  const { ctx, inicial, leer } = fixture();
  await ctx.revalidarAccesoSolicitud!();
  acceso.mockResolvedValue({
    acceso: { ...inicial.acceso, permisosRol: [] },
    modulosActivos: inicial.modulosActivos,
  });
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  sesion.mockRejectedValue(new Error("DB sintética no disponible"));
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toThrow(
    "DB sintética no disponible",
  );
  expect(leer).toHaveBeenCalledTimes(1);
});

it("lee una nueva exigencia MFA dentro de tx aunque la huella no haya cambiado", async () => {
  const { ctx, inicial } = fixture();
  inicial.mfaActiva = false;
  inicial.mfaVerificada = false;
  // La identidad inicial se fija al conectar; este fixture vuelve a conectar con ese estado.
  conectarRevalidacion(ctx, inicial, "erp", async () => ({
    identidad: inicial,
    sesionId: "sesion-confiable",
  }));
  await ctx.revalidarAccesoSolicitud!();
  sesion.mockResolvedValue({ mfaActiva: false, mfaVerificada: false, platformRole: null });
  ajuste.mockResolvedValue(true);
  await expect(ctx.revalidarAccesoEnTransaccion!(ctx.db)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
