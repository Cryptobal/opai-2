// CAR-528: en «ver como» de Terreno, el equipo elegido se usa sin emparejar nada, marcado `verComo`
// (las capacidades rechazan toda escritura); con vista presente nunca se cae al equipo real.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VerComo } from "@/lib/ver-como-token";

const estado = vi.hoisted(() => ({
  cookieEquipo: undefined as string | undefined,
  cookieVista: true,
  identidad: { usuario: { id: "u-admin" } } as unknown,
  vista: null as unknown,
  mfa: null as string | null,
  ejecutar: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => nombre === "opai_ver_como"
      ? (estado.cookieVista ? { value: "vista-ficticia" } : undefined)
      : (estado.cookieEquipo ? { value: estado.cookieEquipo } : undefined),
  }),
}));
vi.mock("@opai/db", () => ({
  dispositivoPorToken: async () => ({ dispositivoId: "real", estado: "activo" }),
}));
vi.mock("@/lib/servidor", () => ({ identidadActual: async () => estado.identidad }));
vi.mock("@/lib/ver-como", () => ({ verComoDe: async () => estado.vista }));
vi.mock("@/lib/mfa", () => ({ verificarMfaDe: async () => estado.mfa }));
vi.mock("@opai/capabilities", () => ({ executeCapability: estado.ejecutar }));
vi.mock("@/lib/medidor", () => ({ contextoSistema: (tenantId: string) => ({ tenantId }) }));
vi.mock("@/lib/fuentes", () => ({ fuentesReales: { modulosActivos: async () => [] } }));
vi.mock("@/lib/rate-limit", () => ({ permitir: async () => true }));

import { dispositivoActual } from "@/lib/dispositivo";
import { ejecutarComoEquipo } from "@/lib/terreno-servidor";

const INSTALACION = "0192f3a0-0000-7000-8000-00000000d001";
const terreno: VerComo = {
  tenantId: "t",
  porUserId: "u-admin",
  sesionId: "s-1",
  portal: "terreno",
  objetivoId: INSTALACION,
  nombre: "Instalación QA",
  userId: null,
  dispositivoId: "d-1",
  expira: Date.now() + 60_000,
};

beforeEach(() => {
  estado.cookieEquipo = undefined;
  estado.cookieVista = true;
  estado.vista = terreno;
  estado.mfa = null;
  estado.ejecutar.mockReset().mockResolvedValue({ ok: true, data: {} });
});

describe("equipo de Terreno en «ver como»", () => {
  it("sin cookie de equipo, usa el equipo de la vista, activo y marcado verComo", async () => {
    expect(await dispositivoActual()).toEqual({
      tenantId: "t",
      dispositivoId: "d-1",
      instalacionId: INSTALACION,
      identificador: "Instalación QA",
      estado: "activo",
      revocadoEn: null,
      verComo: { porUserId: "u-admin" },
    });
  });

  it("con ambas cookies prevalece la vista y conserva solo lectura", async () => {
    estado.cookieEquipo = "equipo-ficticio";
    const equipo = await dispositivoActual();
    expect(equipo).toMatchObject({ dispositivoId: "d-1", verComo: { porUserId: "u-admin" } });
    await ejecutarComoEquipo(equipo!, "core.personas_terreno.listar", {});
    expect(estado.ejecutar.mock.calls[0]?.[0]).toMatchObject({ verComo: { porUserId: "u-admin" } });
  });

  it("vista inválida, otro portal o MFA pendiente no habilitan el equipo real", async () => {
    estado.cookieEquipo = "equipo-ficticio";
    estado.vista = null;
    expect(await dispositivoActual()).toBeNull();
    estado.vista = { ...terreno, portal: "trabajador" };
    expect(await dispositivoActual()).toBeNull();
    estado.vista = terreno;
    estado.mfa = "verificar";
    expect(await dispositivoActual()).toBeNull();
  });

  it("sin cookie de vista conserva el equipo real; sin credenciales devuelve null", async () => {
    estado.cookieVista = false;
    estado.cookieEquipo = "equipo-ficticio";
    const equipo = await dispositivoActual();
    expect(equipo).toMatchObject({ dispositivoId: "real" });
    expect(equipo?.verComo).toBeUndefined();
    estado.cookieEquipo = undefined;
    expect(await dispositivoActual()).toBeNull();
  });

  it("ejecutarComoEquipo marca el contexto verComo con quien mira", async () => {
    const equipo = await dispositivoActual();
    await ejecutarComoEquipo(equipo!, "asistencia.marcas.registrar", {});
    const [ctx, , entrada] = estado.ejecutar.mock.calls[0] ?? [];
    expect(ctx).toMatchObject({ tenantId: "t", verComo: { porUserId: "u-admin" } });
    expect(entrada).toMatchObject({ dispositivoId: "d-1" });
  });
});
