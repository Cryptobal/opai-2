// CAR-188 · PR 2: pruebas de módulos (abrir, vencer, aviso a 7 días) y módulos en solo lectura.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { trabajoCobrosPruebas } from "../src/core/plataforma/cobros";
import {
  debeAvisar,
  diasEntre,
  estadoAlVencer,
  pruebasEnCurso,
} from "../src/core/plataforma/cobros/pruebas";
import { restriccion } from "../src/autorizacion";
import { executeCapability } from "../src/execute";
import { defineCapability } from "../src/define";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
const hoyStr = () => new Date().toISOString().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([
    defineModule({
      id: "crm",
      nombre: "CRM",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: z.object({}),
      eventos: [],
      capacidades: [],
    }),
  ]);
});

const condicion = {
  tenantId: TENANT_DE_PRUEBA,
  moduloId: "crm",
  moneda: "UF",
  forma: "fijo",
  unidad: null,
  precioMensual: 25_000,
  minimoMensual: null,
  cobroDesde: null,
  pruebaHasta: null,
  pasaACobro: false,
  descuentoPct: 0,
  nota: null,
};

function contexto(
  opts: {
    rut?: boolean;
    sinCondicion?: boolean;
    cond?: Record<string, unknown>;
    modulo?: string;
    usuario?: typeof owner | typeof support;
  } = {},
) {
  const s = semillaTenant();
  return contextoDePrueba({
    usuario: opts.usuario ?? owner,
    conTenant: false,
    rol: null,
    semilla: {
      ...s,
      user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
      perfilEmpresa:
        opts.rut === false
          ? []
          : [{ tenantId: TENANT_DE_PRUEBA, rut: "76123456-0", razonSocial: "Gard SpA" }],
      cobroCondicion: opts.sinCondicion ? [] : [{ id: "c1", ...condicion, ...(opts.cond ?? {}) }],
      tenantModule: opts.modulo
        ? [{ id: "m1", tenantId: TENANT_DE_PRUEBA, moduloId: "crm", estado: opts.modulo }]
        : [],
    },
  });
}
const abrir = (hasta: string, extra: Record<string, unknown> = {}) => ({
  tenantId: TENANT_DE_PRUEBA,
  moduloId: "crm",
  pruebaHasta: hasta,
  ...extra,
});

describe("lógica de pruebas", () => {
  it("cuenta días, detecta vencidas y avisos y decide el estado al vencer", () => {
    expect(diasEntre("2026-11-01", "2026-11-08")).toBe(7);
    const ps = pruebasEnCurso(
      [
        { moduloId: "a", pruebaHasta: "2026-11-08", pasaACobro: true },
        { moduloId: "b", pruebaHasta: "2026-10-31", pasaACobro: false },
        { moduloId: "c", pruebaHasta: "2026-12-31", pasaACobro: false },
        { moduloId: "d", pruebaHasta: null, pasaACobro: false },
      ],
      new Map([
        ["a", "trial"],
        ["b", "trial"],
        ["c", "trial"],
        ["d", "trial"],
      ]),
      "2026-11-01",
    );
    expect(ps.map((p) => [p.moduloId, p.diasRestantes])).toEqual([
      ["a", 7],
      ["b", -1],
      ["c", 60],
    ]);
    expect(ps.filter(debeAvisar).map((p) => p.moduloId)).toEqual(["a"]);
    expect(estadoAlVencer({ pasaACobro: true })).toBe("activo");
    expect(estadoAlVencer({ pasaACobro: false })).toBe("solo_lectura");
  });
});

describe("platform.cobros.prueba_abrir", () => {
  it("abre la prueba: módulo en trial y condición con fin de prueba y «pasa a cobro»", async () => {
    const { ctx, tabla } = contexto();
    const r = await executeCapability(
      ctx,
      "platform.cobros.prueba_abrir",
      abrir(enDias(30), { pasaACobro: true }),
    );
    expect(r).toMatchObject({
      ok: true,
      data: { estado: "trial", estadoAnterior: null, pasaACobro: true },
    });
    expect(tabla("tenantModule")).toMatchObject([{ moduloId: "crm", estado: "trial" }]);
    expect(tabla("cobroCondicion")).toMatchObject([{ pasaACobro: true }]);
  });

  it("la vista previa no guarda nada", async () => {
    const { ctx, tabla } = contexto();
    await executeCapability(ctx, "platform.cobros.prueba_abrir", abrir(enDias(30)), {
      dryRun: true,
    });
    expect(tabla("tenantModule")).toHaveLength(0);
  });

  it("exige RUT, condición de cobro y una fecha futura; no abre sobre un módulo activo", async () => {
    const msg = async (c: ReturnType<typeof contexto>, hasta = enDias(10)) => {
      const r = await executeCapability(c.ctx, "platform.cobros.prueba_abrir", abrir(hasta));
      return r.ok ? "ok" : r.error.message;
    };
    expect(await msg(contexto({ rut: false }))).toMatch(/no tiene RUT/);
    expect(await msg(contexto({ sinCondicion: true }))).toMatch(/Fija primero el precio/);
    expect(await msg(contexto(), hoyStr())).toMatch(/después de hoy/);
    expect(await msg(contexto({ modulo: "activo" }))).toMatch(/ya está activo/);
  });

  it("es irreversible para agentes y support no puede abrirla", async () => {
    expect(listarCapacidades().find((c) => c.id === "platform.cobros.prueba_abrir")?.efecto).toBe(
      "irreversible",
    );
    expect(listarCapacidades().find((c) => c.id === "platform.modules.set")?.efecto).toBe(
      "irreversible",
    );
    const { ctx } = contexto({ usuario: support });
    expect(
      await executeCapability(ctx, "platform.cobros.prueba_abrir", abrir(enDias(10))),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("trabajo core.cobros.revisar_pruebas", () => {
  const corre = (modulo: string, cond: Record<string, unknown>, dia: string) => {
    const c = contexto({ modulo, cond });
    return trabajoCobrosPruebas.ejecutar(c.ctx, { dia }).then((r) => ({ r, ...c }));
  };

  it("al vencer con «pasa a cobro» el módulo pasa a activo", async () => {
    const { r, tabla } = await corre(
      "trial",
      { pruebaHasta: new Date("2026-10-31"), pasaACobro: true },
      "2026-11-02",
    );
    expect(r).toMatchObject({ vencidas: [{ moduloId: "crm", estado: "activo" }] });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "activo" }]);
  });

  it("al vencer sin «pasa a cobro» queda en solo lectura, y no se repite", async () => {
    const { r, tabla, ctx } = await corre(
      "trial",
      { pruebaHasta: new Date("2026-10-31") },
      "2026-11-02",
    );
    expect(r).toMatchObject({ vencidas: [{ moduloId: "crm", estado: "solo_lectura" }] });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "solo_lectura" }]);
    expect(await trabajoCobrosPruebas.ejecutar(ctx, { dia: "2026-11-03" })).toMatchObject({
      vencidas: [],
    });
  });

  it("a siete días avisa a Plataforma una sola vez y no cambia el módulo", async () => {
    const { r, tabla } = await corre(
      "trial",
      { pruebaHasta: new Date("2026-11-09") },
      "2026-11-02",
    );
    expect(r).toMatchObject({ vencidas: [], avisadas: ["crm"] });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "trial" }]);
  });
});

describe("módulo en solo lectura", () => {
  const escritura = { id: "crm.negocios.crear", modulo: "crm", efecto: "escritura" } as never;
  const irreversible = {
    id: "crm.negocios.borrar",
    modulo: "crm",
    efecto: "irreversible",
  } as never;
  const lectura = { id: "crm.negocios.list", modulo: "crm", efecto: "lectura" } as never;

  it("deja leer pero rechaza escrituras e irreversibles, con un mensaje claro", () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      modulosActivos: ["crm"],
      modulosSoloLectura: ["crm"],
    });
    expect(restriccion(ctx, lectura)).toBeNull();
    for (const c of [escritura, irreversible])
      expect(restriccion(ctx, c)).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN", message: expect.stringContaining("solo lectura") },
      });
  });

  it("no afecta a otros módulos ni al núcleo", () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      modulosActivos: ["crm", "cpq"],
      modulosSoloLectura: ["crm"],
    });
    expect(
      restriccion(ctx, { id: "cpq.x", modulo: "cpq", efecto: "escritura" } as never),
    ).toBeNull();
    expect(
      restriccion(ctx, { id: "core.x", modulo: "core", efecto: "escritura" } as never),
    ).toBeNull();
  });
});

describe("módulo en solo lectura en el MCP y aviso a 7 días", () => {
  it("el MCP oculta las herramientas que escriben (y su preview) del módulo en solo lectura", async () => {
    const { herramientasMcp } = await import("../src/mcp");
    const crm = defineCapability({
      id: "crm.negocios.crear",
      descripcion: "Crea un negocio del CRM (prueba de solo lectura).",
      permiso: "crm:write",
      input: z.object({}),
      output: z.object({}),
      efecto: "escritura",
      dryRun: true,
      handler: async () => ({}),
    });
    const lee = defineCapability({
      id: "crm.negocios.list",
      descripcion: "Lista los negocios del CRM (prueba de solo lectura).",
      permiso: "crm:read",
      input: z.object({}),
      output: z.array(z.string()),
      efecto: "lectura",
      dryRun: false,
      handler: async () => [],
    });
    registrarCapacidades([crm, lee]);
    const agente = { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id };
    const nombres = (soloLectura: string[]) =>
      herramientasMcp(
        contextoDePrueba({
          rol: "owner",
          actor: agente,
          scopes: ["*"],
          modulosActivos: ["crm"],
          modulosSoloLectura: soloLectura,
        }).ctx,
      ).map((h) => h.nombre);
    expect(nombres([])).toEqual(
      expect.arrayContaining(["crm_negocios_crear", "preview_crm_negocios_crear"]),
    );
    const en = nombres(["crm"]);
    expect(en).toContain("crm_negocios_list");
    expect(en.filter((n) => n.includes("negocios_crear"))).toEqual([]);
  });
});
