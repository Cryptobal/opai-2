import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { CU, N1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { codigo } from "./maestros-ayuda";

// CAR-160 (hallazgo de Codex en #479): marcar «El cliente respondió» en una actividad pausa o detiene el
// seguimiento y puede mover la etapa, así que exige un negocio ligado y comercial:negocios.manage.
beforeEach(reiniciarComercial);

function conPermisos(negar: string[]) {
  const { ctx } = contextoDePrueba({ modulosActivos: ["comercial"], semilla: semillaComercial({ conNegocio: true }), rol: "owner" });
  const base = ctx.autorizar.bind(ctx);
  return { ...ctx, autorizar: (p: string) => !negar.includes(p) && base(p) };
}

const llamada = (vinculos: { tipo: string; id: string }[], respuestaCliente: boolean) => ({
  tipo: "llamada", titulo: "Llamó el cliente", vinculos, respuestaCliente,
});

describe("core.actividades.create · respuesta del cliente", () => {
  it("sin comercial:negocios.manage se rechaza la marca, pero la actividad común se registra", async () => {
    const ctx = conPermisos(["comercial:negocios.manage"]);
    expect(await codigo(ctx, "core.actividades.create", llamada([{ tipo: "negocio", id: N1 }], true))).toBe("FORBIDDEN");
    expect(await codigo(ctx, "core.actividades.create", llamada([{ tipo: "negocio", id: N1 }], false))).toBe("OK");
  });
  it("la marca exige un negocio ligado", async () => {
    const ctx = conPermisos([]);
    expect(await codigo(ctx, "core.actividades.create", llamada([{ tipo: "cuenta", id: CU }], true))).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.actividades.create", llamada([{ tipo: "negocio", id: N1 }], true))).toBe("OK");
  });
});
