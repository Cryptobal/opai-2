import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Contexto } from "@opai/capabilities";

import type * as ActorMod from "../lib/actor";

import { fuentesFalsas, membresia, TENANT, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
let actor: typeof ActorMod;
beforeAll(async () => {
  actor = await import("../lib/actor");
});

const OTRO = "0192f3a0-0000-7000-8000-000000000002";
const sinSesion = async () => null;
const conSesion = async () => ({ user: USUARIO });
const conKey = (key: string) =>
  new Request("http://x/api/v1/core/me", { headers: { authorization: `Bearer ${key}` } });

function esContexto(r: Contexto | Response): Contexto {
  if (r instanceof Response) throw new Error(`Se esperaba contexto, llegó ${r.status}`);
  return r;
}

describe("resolverActor", () => {
  it("sin sesión ni key: 401", async () => {
    const r = await actor.resolverActor(
      new Request("http://x"),
      fuentesFalsas().fuentes,
      sinSesion,
    );
    expect(r instanceof Response && r.status).toBe(401);
  });

  it("con sesión: actor usuario en el tenant de la cookie (si es suyo) con su rol", async () => {
    const otro = membresia({
      tenantId: OTRO,
      rol: "viewer",
      tenant: { id: OTRO, slug: "otro", nombre: "Otro", vertical: "aseo", estado: "activo" },
    });
    const { fuentes } = fuentesFalsas({ membresias: [membresia(), otro] });
    const req = new Request("http://x", { headers: { cookie: `opai_tenant=${OTRO}` } });
    const ctx = esContexto(await actor.resolverActor(req, fuentes, conSesion));
    expect(ctx).toMatchObject({
      tenantId: OTRO,
      rol: "viewer",
      actor: { tipo: "user", id: USUARIO.id },
    });
    const ajeno = new Request("http://x", { headers: { cookie: "opai_tenant=no-es-mio" } });
    expect(esContexto(await actor.resolverActor(ajeno, fuentes, conSesion)).tenantId).toBe(TENANT);
  });

  it("con rol personalizado (#47): ctx.rol sigue siendo el rol base; la autorización usa el rol personalizado", async () => {
    // El miembro es "viewer" en la jerarquía, pero su rol personalizado del tenant le concede
    // justo `core:cuentas.read`. `ctx.rol` conserva el rol base; `autorizar` usa la lista del rol.
    const { fuentes } = fuentesFalsas({
      membresias: [membresia({ rol: "viewer" })],
      acceso: { permisosRol: ["core:cuentas.read"], excepciones: [] },
    });
    const ctx = esContexto(await actor.resolverActor(new Request("http://x"), fuentes, conSesion));
    expect(ctx.rol).toBe("viewer");
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
  });

  it("ignora tenants suspendidos y membresías suspendidas", async () => {
    const suspendido = membresia({
      tenant: {
        id: TENANT,
        slug: "gard",
        nombre: "Gard",
        vertical: "seguridad",
        estado: "suspendido",
      },
    });
    const ctx = esContexto(
      await actor.resolverActor(
        new Request("http://x"),
        fuentesFalsas({ membresias: [suspendido] }).fuentes,
        conSesion,
      ),
    );
    expect(ctx.conTenant).toBe(false);
  });

  it("key válida: agente vía usuario, con scopes y rol del responsable; marca último uso", async () => {
    const { fuentes, secreto, usos } = fuentesFalsas();
    const ctx = esContexto(await actor.resolverActor(conKey(secreto), fuentes, sinSesion));
    expect(ctx).toMatchObject({
      tenantId: TENANT,
      actor: { tipo: "agent", id: "k1", viaUserId: USUARIO.id },
      rol: "owner",
      scopes: ["*"],
      modulosActivos: ["crm"],
    });
    expect(usos).toEqual(["k1"]);
  });

  it("key revocada, vencida, de otro formato o de usuario suspendido: 401", async () => {
    const casos = [
      fuentesFalsas({ key: { revocadaEn: new Date() } }),
      fuentesFalsas({ key: { expiraEn: new Date(Date.now() - 1000) } }),
      fuentesFalsas({ membresias: [membresia({ estado: "suspendida" })] }),
      fuentesFalsas({ membresias: [] }),
    ];
    for (const { fuentes, secreto } of casos) {
      const r = await actor.resolverActor(conKey(secreto), fuentes, conSesion);
      expect(r instanceof Response && r.status).toBe(401);
    }
    const basura = await actor.resolverActor(
      conKey("opai_gard_corta"),
      fuentesFalsas().fuentes,
      conSesion,
    );
    expect(basura instanceof Response && basura.status).toBe(401);
  });
});
