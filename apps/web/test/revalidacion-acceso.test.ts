import { expect, it, vi } from "vitest";
import type { Identidad } from "../lib/actor";

vi.mock("../lib/mfa", () => ({ verificarMfaDe: async (i: Identidad) => !i.mfaVerificada }));
import { crearRevalidacionAcceso } from "../lib/revalidacion-acceso";

import { identidad } from "./revalidacion-fixture";

it("consulta cada vez y acepta solo el reordenamiento de acceso", async () => {
  const inicial = identidad();
  const actual = identidad();
  actual.acceso.permisosRol!.reverse();
  actual.acceso.instalaciones!.reverse();
  actual.acceso.excepciones.reverse();
  actual.modulosActivos.reverse();
  actual.actual!.portales.reverse();
  const leer = vi.fn(async () => actual);
  const revalidar = crearRevalidacionAcceso(inicial, "erp", leer);
  const primera = await revalidar();
  expect(primera).toMatch(/^[a-f0-9]{64}$/);
  expect(await revalidar()).toBe(primera);
  expect(leer).toHaveBeenCalledTimes(2);
});

it("vincula la huella al portal, usuario y tenant", async () => {
  const original = identidad();
  const base = await crearRevalidacionAcceso(original, "erp", async () => original)();
  const otroUsuario = identidad();
  otroUsuario.usuario.id = "u2";
  const otroTenant = identidad();
  otroTenant.actual!.tenantId = "t2";
  const sellos = await Promise.all([
    crearRevalidacionAcceso(original, "trabajador", async () => original)(),
    crearRevalidacionAcceso(otroUsuario, "erp", async () => otroUsuario)(),
    crearRevalidacionAcceso(otroTenant, "erp", async () => otroTenant)(),
  ]);
  for (const sello of sellos) expect(sello).not.toBe(base);
});

it.each([
  [
    "otro usuario",
    (i: Identidad) => {
      i.usuario.id = "u2";
    },
  ],
  [
    "fallback de tenant",
    (i: Identidad) => {
      i.actual!.tenantId = "t2";
    },
  ],
  [
    "membresía revocada",
    (i: Identidad) => {
      i.actual!.estado = "suspendida";
    },
  ],
  [
    "tenant suspendido",
    (i: Identidad) => {
      i.actual!.tenant.estado = "suspendido";
    },
  ],
  [
    "portal retirado",
    (i: Identidad) => {
      i.actual!.portales = ["trabajador"];
    },
  ],
  [
    "permiso retirado",
    (i: Identidad) => {
      i.acceso.permisosRol = [];
    },
  ],
  [
    "alcance reducido",
    (i: Identidad) => {
      i.acceso.instalaciones = ["i1"];
    },
  ],
  [
    "alcance ampliado",
    (i: Identidad) => {
      i.acceso.instalaciones = null;
    },
  ],
  [
    "módulo retirado",
    (i: Identidad) => {
      i.modulosActivos = ["crm"];
    },
  ],
  [
    "solo lectura",
    (i: Identidad) => {
      i.modulosSoloLectura = ["agente"];
    },
  ],
  [
    "MFA revocada",
    (i: Identidad) => {
      i.mfaVerificada = false;
    },
  ],
] as const)("rechaza %s durante la operación", async (_nombre, cambiar) => {
  const actual = identidad();
  const revalidar = crearRevalidacionAcceso(identidad(), "erp", async () => actual);
  cambiar(actual);
  await expect(revalidar()).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("sesión revocada o error al leer acceso falla cerrado", async () => {
  await expect(
    crearRevalidacionAcceso(identidad(), "erp", async () => null)(),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const error = new Error("lectura no disponible");
  await expect(
    crearRevalidacionAcceso(identidad(), "erp", async () => {
      throw error;
    })(),
  ).rejects.toBe(error);
});
