import { beforeAll, describe, expect, it, vi } from "vitest";

import type * as Capabilities from "@opai/capabilities";

import { estadoMfaDe, verificarMfaDe } from "../lib/mfa";

import type * as ActorMod from "../lib/actor";
import { fuentesFalsas, membresia, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");

const ajusteMock = vi.fn(async (..._args: unknown[]) => true);
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<typeof Capabilities>()),
  ajuste: (...args: unknown[]) => ajusteMock(...args),
}));

// `../lib/actor` carga `@opai/auth` (necesita DATABASE_URL al importarse); se importa dinámico
// después del `vi.stubEnv` de arriba, en vez de estático (patrón de actor.test.ts y
// platform-superadmin.test.ts): un import estático se resuelve antes que cualquier statement del
// módulo, incluido `vi.stubEnv`, así que en CI (sin DATABASE_URL en el entorno) rompería igual.
let actor: typeof ActorMod;
beforeAll(async () => {
  actor = await import("../lib/actor");
});

/**
 * Choque con #68 (review del Revisor): la política de MFA no puede depender del portal "erp" — un
 * usuario que solo tiene el portal Supervisor (sin membresía "erp") debe exigir o completar el
 * segundo factor igual que cualquier otro, porque `lib/mfa.ts` construye el contexto con
 * `portal: null`, nunca con un portal fijo.
 */
describe("MFA con un usuario que solo tiene el portal Supervisor (#68)", () => {
  const soloSupervisor = membresia({ rol: "viewer", portales: ["supervisor"] });

  async function identidadSupervisor(twoFactorEnabled: boolean, mfaVerified: boolean) {
    const { fuentes } = fuentesFalsas({ membresias: [soloSupervisor] });
    const identidad = await actor.identidadDe({ ...USUARIO, twoFactorEnabled }, undefined, fuentes);
    identidad.mfaVerificada = mfaVerified;
    return identidad;
  }

  it("la empresa ya no puede obligarla (CAR-286): sin segundo factor entra igual", async () => {
    ajusteMock.mockResolvedValue(true);
    const identidad = await identidadSupervisor(false, false);
    expect(await estadoMfaDe(identidad)).toMatchObject({ activa: false, obligatoria: false });
    expect(await verificarMfaDe(identidad)).toBeNull();
    expect(ajusteMock).not.toHaveBeenCalled();
  });

  it("con el segundo factor activo y la sesión verificada, completa sin pedir el portal erp", async () => {
    ajusteMock.mockResolvedValue(true);
    const identidad = await identidadSupervisor(true, true);
    expect(await verificarMfaDe(identidad)).toBeNull();
  });

  it("activo pero sin verificar esta sesión: sigue pidiendo verificar", async () => {
    ajusteMock.mockResolvedValue(true);
    const identidad = await identidadSupervisor(true, false);
    expect(await verificarMfaDe(identidad)).toBe("verificar");
  });
});
