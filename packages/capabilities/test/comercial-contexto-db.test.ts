// CAR-138 PR 4 · contexto comercial del negocio contra Postgres real (si hay DATABASE_URL_TEST): lo inferido
// por un agente no se confunde con lo confirmado, solo una persona confirma y otra empresa no lo ve.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../../db/src/catalogo-comercial";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Nota = { id: string; estado: string; fuente: string; fechaFuente: string };

describe.skipIf(!urlPropietario)("comercial · contexto del negocio en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  let negocio = "";
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();

  const ctx = (
    tenantId: string,
    actor: "user" | "agent" = "user",
    rol: "owner" | "viewer" = "owner",
  ) =>
    mod.crearContexto({
      tenantId,
      actor:
        actor === "user"
          ? { tipo: "user", id: usuario }
          : { tipo: "agent", id: randomUUID(), viaUserId: usuario },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
      medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    const sufijo = randomUUID().slice(0, 8);
    const tenant = async (n: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${n}-${sufijo}`, nombre: n, vertical: "seguridad" },
        })
      ).id;
    tA = await tenant("ctx-a");
    tB = await tenant("ctx-b");
    await sembrarComercial(e.admin.$extends({}), tA);
    const o = ctx(tA);
    const cuenta = await run(o, "core.cuentas.create", { nombre: "Alfa" });
    if (!cuenta.ok) throw new Error(`cuenta: ${JSON.stringify(cuenta.error)}`);
    const cuentaId = (cuenta.data as { id: string }).id;
    const n = await run(o, "comercial.negocios.create", { cuentaId, titulo: "Guardias" });
    if (!n.ok) throw new Error(`negocio: ${JSON.stringify(n.error)}`);
    negocio = (n.data as { id: string }).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const agregar = (c: ReturnType<typeof ctx>, extra: object = {}) =>
    run(c, "comercial.contexto.agregar", {
      negocioId: negocio,
      tipo: "reunion",
      resumen: "Piden cobertura nocturna",
      fuente: "Reunión con gerencia",
      fechaFuente: "2026-11-05",
      ...extra,
    });

  it("una persona registra confirmado; sin pedirlo queda inferido; la vista previa no escribe", async () => {
    const vista = await run(
      ctx(tA),
      "comercial.contexto.agregar",
      {
        negocioId: negocio,
        resumen: "Solo vista previa",
        fuente: "Prueba",
        fechaFuente: "2026-11-05",
      },
      { dryRun: true },
    );
    expect(JSON.stringify(vista)).toContain('"ok":true');
    expect(await e.admin.negocioContexto.count({ where: { negocioId: negocio } })).toBe(0);
    const conf = await agregar(ctx(tA), { estado: "confirmado" });
    expect(conf.ok && (conf.data as Nota).estado).toBe("confirmado");
    const inf = await agregar(ctx(tA), { resumen: "Posible ampliación" });
    expect(inf.ok && (inf.data as Nota).estado).toBe("inferido");
  });

  it("un agente siempre deja inferido y no puede confirmar", async () => {
    const r = await agregar(ctx(tA, "agent"), { estado: "confirmado", resumen: "Dato del agente" });
    expect(r.ok && (r.data as Nota).estado).toBe("inferido");
    const id = r.ok ? (r.data as Nota).id : "";
    const intento = await run(ctx(tA, "agent"), "comercial.contexto.confirmar", {
      negocioId: negocio,
      contextoId: id,
    });
    expect(intento.ok).toBe(false);
    const persona = await run(ctx(tA), "comercial.contexto.confirmar", {
      negocioId: negocio,
      contextoId: id,
    });
    expect(persona.ok && (persona.data as Nota).estado).toBe("confirmado");
  });

  it("lista más reciente primero, filtra por confirmado y no acepta fechas futuras", async () => {
    const todas = await run(ctx(tA), "comercial.contexto.listar", { negocioId: negocio });
    expect(todas.ok && (todas.data as Nota[]).length).toBeGreaterThanOrEqual(3);
    const solo = await run(ctx(tA), "comercial.contexto.listar", {
      negocioId: negocio,
      soloConfirmado: true,
    });
    expect(solo.ok && (solo.data as Nota[]).every((n) => n.estado === "confirmado")).toBe(true);
    const futura = await agregar(ctx(tA), { fechaFuente: "2999-01-01" });
    expect(futura.ok).toBe(false);
    // Una fecha que no existe no se normaliza en silencio a otra: se rechaza.
    expect((await agregar(ctx(tA), { fechaFuente: "2026-02-31" })).ok).toBe(false);
    expect((await agregar(ctx(tA), { fechaFuente: "2026-00-10" })).ok).toBe(false);
  });

  it("la base impide asociar una nota de una empresa al negocio de otra", async () => {
    await expect(
      e.admin.negocioContexto.create({
        data: {
          tenantId: tB,
          negocioId: negocio,
          tipo: "nota",
          resumen: "Cruzada",
          fuente: "Prueba",
          fechaFuente: new Date("2026-11-05T00:00:00Z"),
          estado: "inferido",
        },
      }),
    ).rejects.toThrow();
  });

  it("archivar la saca de la lista y otra empresa no ve el negocio ni sus notas", async () => {
    const l = await run(ctx(tA), "comercial.contexto.listar", { negocioId: negocio });
    const id = l.ok ? ((l.data as Nota[])[0]?.id ?? "") : "";
    expect(
      (await run(ctx(tA), "comercial.contexto.archivar", { negocioId: negocio, contextoId: id }))
        .ok,
    ).toBe(true);
    const despues = await run(ctx(tA), "comercial.contexto.listar", { negocioId: negocio });
    expect(despues.ok && (despues.data as Nota[]).some((n) => n.id === id)).toBe(false);
    expect((await run(ctx(tB), "comercial.contexto.listar", { negocioId: negocio })).ok).toBe(
      false,
    );
    expect((await agregar(ctx(tB))).ok).toBe(false);
  });

  it("quien solo puede leer no agrega ni confirma", async () => {
    expect((await agregar(ctx(tA, "user", "viewer"))).ok).toBe(false);
    expect(
      (await run(ctx(tA, "user", "viewer"), "comercial.contexto.listar", { negocioId: negocio }))
        .ok,
    ).toBe(true);
  });
});
