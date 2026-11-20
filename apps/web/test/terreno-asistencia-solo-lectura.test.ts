import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  equipo: { tenantId: "qa-tenant", dispositivoId: "qa-equipo", instalacionId: "qa-instalacion", estado: "activo" } as Record<string, unknown> | null,
  ejecutar: vi.fn(),
  permitir: vi.fn(),
}));
vi.mock("@/lib/dispositivo", () => ({ dispositivoActual: async () => estado.equipo }));
vi.mock("@/lib/medidor", () => ({ contextoSistema: (tenantId: string, modulosActivos: string[]) => ({ tenantId, modulosActivos }) }));
vi.mock("@/lib/rate-limit", () => ({ permitir: estado.permitir }));
vi.mock("@opai/capabilities", () => ({ executeCapability: estado.ejecutar }));

import { ejecutarAsistenciaEquipo } from "@/app/_acciones/terreno-asistencia";

beforeEach(() => {
  estado.equipo = { tenantId: "qa-tenant", dispositivoId: "qa-equipo", instalacionId: "qa-instalacion", estado: "activo" };
  estado.ejecutar.mockReset().mockResolvedValue({ ok: true, data: {} });
  estado.permitir.mockReset().mockResolvedValue(true);
});

describe("contexto confiable de asistencia de equipo", () => {
  it.each(["asistencia.marcas.registrar", "asistencia.rostro.estado", "asistencia.rostro.textos", "asistencia.rostro.iniciar_vida", "asistencia.rostro.consentir", "asistencia.rostro.revocar", "asistencia.rostro.enrolar"])("propaga solo lectura a %s", async (id) => {
    estado.equipo!.verComo = { porUserId: "qa-admin" };
    await ejecutarAsistenciaEquipo(id, {});
    expect(estado.ejecutar.mock.calls[0]?.[0]).toMatchObject({ tenantId: "qa-tenant", verComo: { porUserId: "qa-admin" } });
  });
  it("conserva equipo normal y los identificadores resueltos en servidor", async () => {
    await ejecutarAsistenciaEquipo("asistencia.marcas.registrar", { dispositivoId: "ignorado", instalacionId: "ignorada", canal: "ignorado" });
    expect(estado.ejecutar.mock.calls[0]?.[0]).not.toHaveProperty("verComo");
    expect(estado.ejecutar.mock.calls[0]?.[2]).toEqual({ dispositivoId: "qa-equipo", instalacionId: "qa-instalacion", canal: "kiosco" });
    expect(estado.permitir).toHaveBeenCalledWith("asistencia-equipo:qa-equipo", 60, 60_000, { fallarCerrado: true });
  });
  it("rechaza acciones fuera de lista, ausencia de equipo y límite denegado", async () => {
    expect((await ejecutarAsistenciaEquipo("otra.accion", {})).ok).toBe(false);
    estado.equipo = null;
    expect((await ejecutarAsistenciaEquipo("asistencia.marcas.registrar", {})).ok).toBe(false);
    estado.equipo = { estado: "activo", dispositivoId: "qa-equipo" };
    estado.permitir.mockResolvedValue(false);
    expect((await ejecutarAsistenciaEquipo("asistencia.marcas.registrar", {})).ok).toBe(false);
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });
});
