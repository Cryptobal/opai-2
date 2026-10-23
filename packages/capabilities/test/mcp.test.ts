import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const leerCrm = defineCapability({
  id: "crm.lead.list",
  descripcion: "Leads.",
  permiso: "crm:read",
  input: z.object({}),
  output: z.array(z.string()),
  efecto: "lectura",
  dryRun: false,
  handler: async () => [],
});

const agente = { tipo: "agent" as const, id: "k1", viaUserId: USUARIO_DE_PRUEBA.id };
const nombres = (ctx: Parameters<typeof herramientasMcp>[0]) =>
  herramientasMcp(ctx).map((h) => h.nombre);

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, leerCrm]);
});

describe("herramientasMcp", () => {
  it("todo input expuesto se puede expresar en JSON Schema (tools/list)", () => {
    for (const c of capacidadesDelNucleo.filter((x) => !x.interna)) {
      expect(() => z.toJSONSchema(c.input, { io: "input" }), c.id).not.toThrow();
    }
  });

  it("deriva herramientas del registro con preview_ solo para escrituras y sin internas", () => {
    const { ctx } = contextoDePrueba({ rol: "owner", actor: agente, scopes: ["*"] });
    const n = nombres(ctx);
    expect(n).toEqual(
      expect.arrayContaining([
        "core_me",
        "core_users_list",
        "core_users_invite",
        "preview_core_users_invite",
      ]),
    );
    expect(n).not.toContain("preview_core_users_list");
    expect(n).not.toContain("preview_core_me");
    expect(n.some((x) => x.includes("invitations_accept") || x.includes("invitations_peek"))).toBe(
      false,
    );
  });

  it("respeta scopes, módulos activos y permisos del usuario responsable", () => {
    const soloCore = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["core"],
      modulosActivos: ["crm"],
    }).ctx;
    expect(nombres(soloCore)).not.toContain("crm_lead_list");
    const crmInactivo = contextoDePrueba({ rol: "owner", actor: agente, scopes: ["*"] }).ctx;
    expect(nombres(crmInactivo)).not.toContain("crm_lead_list");
    const crmActivo = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["*"],
      modulosActivos: ["crm"],
    }).ctx;
    expect(nombres(crmActivo)).toContain("crm_lead_list");
    const viewer = contextoDePrueba({ rol: "viewer", actor: agente, scopes: ["*"] }).ctx;
    expect(nombres(viewer)).toContain("core_users_list");
    expect(nombres(viewer)).not.toContain("core_users_invite");
  });

  it("'*' no expone plataforma aunque el responsable tenga platformRole", () => {
    const usuario = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
    const { ctx } = contextoDePrueba({ rol: "owner", usuario, actor: agente, scopes: ["*"] });
    expect(nombres(ctx).some((n) => n.startsWith("platform_"))).toBe(false);
  });

  it("preview_ ejecuta con dryRun y no audita; la real audita como agente vía usuario", async () => {
    const { ctx, eventos, tabla } = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["*"],
      semilla: semillaTenant(),
    });
    const [real, preview] = herramientasMcp(ctx).filter(
      (h) => h.capacidad.id === "core.users.invite",
    );
    const args = { email: "nuevo@prueba.cl", rol: "viewer" };
    expect(await ejecutarHerramienta(ctx, preview!, args)).toMatchObject({
      ok: true,
      dryRun: true,
    });
    expect(tabla("invitation")).toHaveLength(0);
    expect(await ejecutarHerramienta(ctx, real!, args)).toMatchObject({ ok: true, dryRun: false });
    expect(eventos).toMatchObject([{ capability: "core.users.invite", actor: agente }]);
  });
});
