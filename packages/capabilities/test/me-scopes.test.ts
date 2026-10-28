import { beforeEach, describe, expect, it } from "vitest";

import { modulos } from "../../../modules/registry/src";
import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { herramientasMcp } from "../src/mcp";
import { limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

const actor = { tipo: "agent" as const, id: "k-1", viaUserId: USUARIO_DE_PRUEBA.id };
const key = (scopes: string[]) =>
  contextoDePrueba({
    actor,
    scopes,
    modulosActivos: ["comercial"],
    claveApi: { permisos: null, servicio: false },
    semilla: semillaTenant(),
  }).ctx;

type Me = { permisos: string[]; scopes: string[] | null };
async function me(ctx: ReturnType<typeof key>): Promise<Me> {
  const r = await executeCapability(ctx, "core.me", {});
  if (!r.ok) throw new Error(r.error.message);
  return r.data as Me;
}

// Caso reportado el 28-oct-2026: Comercial activo para Gard y core_me con comercial:negocios.manage,
// pero tools/list sin comercial_*. La key no tenía el scope comercial: core.me ahora dice lo mismo.
describe("core.me y tools/list coinciden según los scopes de la key", () => {
  it("una key sin el scope comercial no lista permisos ni herramientas comerciales, y muestra sus scopes", async () => {
    const ctx = key(["core"]);
    const datos = await me(ctx);
    expect(datos.scopes).toEqual(["core"]);
    expect(datos.permisos.filter((p) => p.startsWith("comercial:"))).toEqual([]);
    expect(herramientasMcp(ctx).filter((h) => h.capacidad.modulo === "comercial")).toEqual([]);
  });

  it("con «*» o el scope comercial: permisos y herramientas comerciales a la vez", async () => {
    for (const scopes of [["*"], ["core", "comercial"]]) {
      const ctx = key(scopes);
      expect((await me(ctx)).permisos).toContain("comercial:negocios.manage");
      const nombres = herramientasMcp(ctx).map((h) => h.nombre);
      expect(nombres).toContain("comercial_negocios_create");
      expect(nombres).toContain("comercial_negocios_embudo");
    }
  });

  it("una sesión humana no tiene scopes", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"], semilla: semillaTenant() });
    const datos = await me(ctx);
    expect(datos.scopes).toBeNull();
    expect(datos.permisos).toContain("comercial:negocios.manage");
  });
});
