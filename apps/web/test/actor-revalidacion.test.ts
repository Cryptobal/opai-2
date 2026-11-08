import { afterAll, expect, it, vi } from "vitest";
import { fuentesFalsas, membresia, USUARIO } from "./fuentes-falsas";

const { vigente } = vi.hoisted(() => ({ vigente: vi.fn() }));
// crearContexto construye el cliente perezoso; estas pruebas no consultan ninguna base.
vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:1/fixture");
afterAll(() => vi.unstubAllEnvs());
vi.mock("@opai/auth", () => ({ sesionDeRequest: vi.fn(), sesionVigente: vigente }));
vi.mock("../lib/mfa", () => ({
  verificarMfaDe: async () => false,
  estadoMfaDe: async () => ({ activa: true, verificada: true, obligatoria: true }),
}));
import { contextoDeIdentidad, identidadDe, resolverActor } from "../lib/actor";

const sesion = () => ({
  user: { ...USUARIO, twoFactorEnabled: true },
  session: { mfaVerified: true },
});

it("Server Action relee fuentes y rechaza fallback cuando la membresía inicial se revoca", async () => {
  const primera = membresia();
  const otra = membresia({ id: "m2", tenantId: "otro" });
  const { fuentes } = fuentesFalsas({ membresias: [primera, otra], modulosActivos: ["agente"] });
  const inicial = await identidadDe(sesion().user, primera.tenantId, fuentes);
  inicial.mfaVerificada = true;
  const leer = vi.fn(async () => sesion());
  const ctx = contextoDeIdentidad(inicial, "erp", { fuentes, obtenerSesion: leer });
  await ctx.revalidarAccesoSolicitud!();
  primera.estado = "suspendida";
  await expect(ctx.revalidarAccesoSolicitud!()).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(leer).toHaveBeenCalledTimes(2);
  expect(ctx.tenantId).toBe(primera.tenantId);
});

it("el borde Request reconsulta con sus headers y detecta la sesión revocada", async () => {
  vigente.mockReset().mockResolvedValueOnce(sesion()).mockResolvedValueOnce(null);
  const req = new Request("http://fixture.invalid/api/agente", { headers: { cookie: "fixture" } });
  const { fuentes } = fuentesFalsas({ modulosActivos: ["agente"] });
  const ctx = await resolverActor(req, fuentes, async () => sesion());
  if (ctx instanceof Response) throw new Error("Se esperaba contexto");
  expect(ctx.portal).toBeNull();
  const huella = await ctx.revalidarAccesoSolicitud!();
  const inicial = await identidadDe(sesion().user, ctx.tenantId, fuentes);
  inicial.mfaVerificada = true;
  const erp = contextoDeIdentidad(inicial, "erp", { fuentes, obtenerSesion: async () => sesion() });
  expect(huella).toBe(await erp.revalidarAccesoSolicitud!());
  await expect(ctx.revalidarAccesoSolicitud!()).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(vigente).toHaveBeenLastCalledWith(req.headers);
});
