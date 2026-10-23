import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant } from "./semilla";

beforeEach(reiniciar);

const KEY = "0192f3a0-0000-7000-8000-00000000c0de";
const CUENTA = "0192f3a0-0000-7000-8000-0000000000c1";
const OTRA = "0192f3a0-0000-7000-8000-0000000000c2";

const aprobacion = (id: string, capability: string, input: Record<string, unknown>) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  apiKeyId: KEY,
  viaUserId: USUARIO_DE_PRUEBA.id,
  capability,
  input,
  resumen: `${capability} propuesto`,
  estado: "pendiente",
  venceEn: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
});

function escenario() {
  return contextoDePrueba({
    semilla: {
      ...semillaTenant(),
      apiKey: [
        {
          id: KEY,
          nombre: "Grokbot",
          prefijo: "opai_live_7Hq2",
          userId: USUARIO_DE_PRUEBA.id,
          scopes: ["*"],
          presupuestoMensualMicro: BigInt(25_000_000),
        },
      ],
      aprobacion: [
        aprobacion("0192f3a0-0000-7000-8000-0000000000d1", "core.cuentas.set_estado", {
          id: CUENTA,
          estado: "cliente_activo",
        }),
        aprobacion("0192f3a0-0000-7000-8000-0000000000d2", "core.contactos.create", {
          cuentaId: CUENTA,
          nombres: "Paula",
        }),
        aprobacion("0192f3a0-0000-7000-8000-0000000000d3", "core.users.remove", { id: OTRA }),
      ],
    },
  });
}

type Aprobacion = { capability: string; via: string | null; riesgo: string };

describe("bandeja de aprobaciones y ficha de la key (diseños 24, 25, 44 y 45)", () => {
  it("filtra por entidad (input.id o input.<tipo>Id) e informa vía y riesgo", async () => {
    const { ctx } = escenario();
    const deCuenta = await dato<Aprobacion[]>(ctx, "core.aprobaciones.list", {
      estado: "pendiente",
      entidad: { tipo: "cuenta", id: CUENTA },
    });
    expect(deCuenta.map((a) => a.capability).sort()).toEqual([
      "core.contactos.create",
      "core.cuentas.set_estado",
    ]);
    const todas = await dato<Aprobacion[]>(ctx, "core.aprobaciones.list", {});
    expect(todas.find((a) => a.capability === "core.users.remove")).toMatchObject({
      via: "Ana Prueba",
      riesgo: "alto",
    });
  });

  it("la ficha de la key trae presupuesto y autonomía de lo irreversible (aprobación por defecto)", async () => {
    const { ctx } = escenario();
    await dato(ctx, "core.apikeys.set_autonomia", {
      apiKeyId: KEY,
      capability: "core.users.remove",
      nivel: "directo",
    });
    const k = await dato<{
      presupuestoMensualUsd: number;
      autonomia: { capability: string; nivel: string }[];
    }>(ctx, "core.apikeys.get", { id: KEY });
    expect(k.presupuestoMensualUsd).toBe(25);
    expect(k.autonomia.find((a) => a.capability === "core.users.remove")?.nivel).toBe("directo");
    expect(k.autonomia.find((a) => a.capability === "core.vinculos.terminar")?.nivel).toBe(
      "aprobacion",
    );
  });
});
