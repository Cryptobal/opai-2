// CAR-323 (D.5): el solo lectura es por empresa. Con el mismo registro, una key de la empresa A
// (módulo en solo lectura) no ve ni ejecuta las herramientas que escriben, y una key de la empresa B
// (módulo activo) sí. También: una capacidad entrante tiene que ser interna (nunca sale por MCP).
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineCapability } from "../src/define";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

const salida = z.object({ ok: z.boolean() });
const leer = defineCapability({
  id: "crm.banco.ver",
  descripcion: "Lista los movimientos del banco de la empresa (prueba de solo lectura).",
  permiso: null,
  input: z.object({}),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler() {
    return { ok: true };
  },
});
const crear = defineCapability({
  id: "crm.banco.crear",
  descripcion: "Registra un movimiento del banco a mano (prueba de solo lectura).",
  permiso: null,
  input: z.object({}),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler() {
    return { ok: true };
  },
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([leer, crear]);
});

const key = (tenantId: string, soloLectura: string[]) => {
  const { ctx } = contextoDePrueba({
    actor: { tipo: "agent", id: `k-${tenantId}`, viaUserId: USUARIO_DE_PRUEBA.id },
    scopes: ["*"],
    modulosActivos: ["crm"],
    modulosSoloLectura: soloLectura,
    claveApi: { permisos: null, servicio: false },
  });
  return { ...ctx, tenantId };
};

const nombres = (ctx: ReturnType<typeof key>) => herramientasMcp(ctx).map((h) => h.nombre).sort();

describe("solo lectura por empresa en el MCP", () => {
  it("la empresa en solo lectura solo ve la lectura; la activa ve todo", () => {
    expect(nombres(key("empresa-a", ["crm"]))).toEqual(["crm_banco_ver"]);
    expect(nombres(key("empresa-b", []))).toEqual([
      "crm_banco_crear",
      "crm_banco_ver",
      "preview_crm_banco_crear",
    ]);
  });

  it("la herramienta de B, usada con la key de A, se rechaza por solo lectura", async () => {
    const b = key("empresa-b", []);
    const herramienta = herramientasMcp(b).find((h) => h.nombre === "crm_banco_crear");
    if (!herramienta) throw new Error("falta la herramienta en la empresa activa");
    expect(await ejecutarHerramienta(b, herramienta, {})).toMatchObject({ ok: true });
    expect(await ejecutarHerramienta(key("empresa-a", ["crm"]), herramienta, {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", message: expect.stringContaining("solo lectura") },
    });
  });

  it("una capacidad entrante que no es interna no se puede definir", () => {
    expect(() =>
      defineCapability({
        id: "crm.banco.recibir",
        descripcion: "Registra un movimiento que llega desde el banco (prueba de entrante).",
        permiso: null,
        entrante: true,
        input: z.object({}),
        output: salida,
        efecto: "escritura",
        dryRun: true,
        async handler() {
          return { ok: true };
        },
      }),
    ).toThrow(/entrante y debe ser interna/);
  });
});
