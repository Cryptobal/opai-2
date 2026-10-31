import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Rol } from "@opai/domain";
import { CU, CU2, I1, K1, K2, N1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { codigo, dato } from "./maestros-ayuda";

// CRM PR 2a (CAR-26): contacto en varias cuentas, actividad unificada y etiquetas. Datos ficticios.
beforeEach(reiniciarComercial);

const vinculo = (id: string, contactoId: string, cuentaId: string, esPrincipal: boolean) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  contactoId,
  cuentaId,
  cargo: null,
  roles: [],
  esPrincipal,
  createdAt: new Date("2026-01-01T00:00:00Z"),
});
const V1 = "0192f3a0-0000-7000-8000-0000000000v1".replace("v", "9");
const V2 = "0192f3a0-0000-7000-8000-0000000000v2".replace("v", "9");

function entorno(rol: Rol = "owner", agente = false, conNegocio = true) {
  const base = {
    modulosActivos: ["comercial"],
    semilla: {
      ...semillaComercial(conNegocio ? { conNegocio } : {}),
      contactoCuenta: [vinculo(V1, K1, CU, true), vinculo(V2, K2, CU, false)],
      membership: [
        {
          id: "0192f3a0-0000-7000-8000-0000000000m1",
          tenantId: TENANT_DE_PRUEBA,
          userId: USUARIO_DE_PRUEBA.id,
          estado: "activa",
          rol: "owner",
        },
      ],
    },
    rol,
  };
  return agente
    ? contextoDePrueba({
        ...base,
        actor: { tipo: "agent", id: K1, viaUserId: USUARIO_DE_PRUEBA.id },
        agente: { apiKeyId: K1, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
      })
    : contextoDePrueba(base);
}

describe("core · contacto en varias cuentas (N–N)", () => {
  it("vincula a otra cuenta, lista las cuentas y no escribe en la vista previa", async () => {
    const { ctx, tabla } = entorno();
    const entrada = {
      contactoId: K1,
      cuentaId: CU2,
      cargo: "Jefa de compras",
      roles: ["facturacion"],
    };
    await dato(ctx, "core.contactos.vincular", entrada, { dryRun: true });
    expect(tabla("contactoCuenta")).toHaveLength(2);
    await dato(ctx, "core.contactos.vincular", entrada);
    const cuentas = await dato<{ cuentaId: string; roles: string[] }[]>(
      ctx,
      "core.contactos.cuentas",
      { contactoId: K1 },
    );
    expect(cuentas.map((c) => c.cuentaId).sort()).toEqual([CU, CU2].sort());
    expect(cuentas.find((c) => c.cuentaId === CU2)?.roles).toEqual(["facturacion"]);
    expect(await codigo(ctx, "core.contactos.vincular", entrada)).toBe("CONFLICT");
  });

  it("un solo principal por cuenta: el nuevo desmarca al anterior", async () => {
    const { ctx } = entorno();
    await dato(ctx, "core.contactos.set_roles", {
      contactoId: K2,
      cuentaId: CU,
      esPrincipal: true,
    });
    const lista = await dato<{ contactoId: string; esPrincipal: boolean }[]>(
      ctx,
      "core.cuentas.contactos",
      { cuentaId: CU },
    );
    expect(lista.filter((c) => c.esPrincipal).map((c) => c.contactoId)).toEqual([K2]);
  });

  it("desvincular conserva al menos una cuenta y un agente necesita aprobación", async () => {
    const { ctx } = entorno("owner", false, false);
    expect(await codigo(ctx, "core.contactos.desvincular", { contactoId: K1, cuentaId: CU })).toBe(
      "UNPROCESSABLE",
    );
    await dato(ctx, "core.contactos.vincular", { contactoId: K1, cuentaId: CU2 });
    const r = await dato<{ cuentasRestantes: number }>(ctx, "core.contactos.desvincular", {
      contactoId: K1,
      cuentaId: CU,
    });
    expect(r.cuentasRestantes).toBe(1);
    const agente = entorno("owner", true, false);
    expect(
      await executeCapability(
        agente.ctx,
        "core.contactos.desvincular",
        { contactoId: K1, cuentaId: CU },
        {},
      ),
    ).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
  });

  it("no se quita a un contacto de una cuenta donde participa en un negocio", async () => {
    const { ctx } = entorno();
    await dato(ctx, "core.contactos.vincular", { contactoId: K1, cuentaId: CU2 });
    expect(await codigo(ctx, "core.contactos.desvincular", { contactoId: K1, cuentaId: CU })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("el negocio acepta un contacto vinculado a su cuenta aunque su cuenta inicial sea otra", async () => {
    const { ctx } = entorno();
    const n = await dato<{ id: string }>(ctx, "comercial.negocios.create", {
      cuentaId: CU2,
      titulo: "Negocio",
    });
    const entrada = {
      negocioId: n.id,
      contactos: [{ contactoId: K1, rol: "decisor", esPrincipal: true }],
    };
    expect(await codigo(ctx, "comercial.negocios.set_contactos", entrada)).toBe("UNPROCESSABLE");
    await dato(ctx, "core.contactos.vincular", { contactoId: K1, cuentaId: CU2 });
    expect(await codigo(ctx, "comercial.negocios.set_contactos", entrada)).toBe("OK");
  });

  it("viewer lee pero no vincula", async () => {
    const { ctx } = entorno("viewer");
    expect(await codigo(ctx, "core.contactos.cuentas", { contactoId: K1 })).toBe("OK");
    expect(await codigo(ctx, "core.contactos.vincular", { contactoId: K1, cuentaId: CU2 })).toBe(
      "FORBIDDEN",
    );
  });
});

describe("core · actividad unificada", () => {
  const nota = (extra: Record<string, unknown> = {}) => ({
    tipo: "nota",
    titulo: "Llamada de seguimiento",
    vinculos: [
      { tipo: "negocio", id: N1 },
      { tipo: "cuenta", id: CU },
    ],
    ...extra,
  });

  it("se liga a varias entidades y aparece en el timeline de cada una", async () => {
    const { ctx } = entorno();
    const a = await dato<{ id: string; vinculos: unknown[] }>(
      ctx,
      "core.actividades.create",
      nota(),
    );
    expect(a.vinculos).toHaveLength(2);
    for (const [entidadTipo, entidadId] of [
      ["negocio", N1],
      ["cuenta", CU],
    ] as const) {
      const t = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.timeline", {
        entidadTipo,
        entidadId,
      });
      expect(t.items.map((i) => i.id)).toEqual([a.id]);
    }
    const otra = await dato<{ items: unknown[] }>(ctx, "core.actividades.timeline", {
      entidadTipo: "instalacion",
      entidadId: I1,
    });
    expect(otra.items).toHaveLength(0);
  });

  it("valida vínculos, campos propios de la tarea y de la reunión", async () => {
    const { ctx } = entorno();
    const salida = "0192f3a0-0000-7000-8000-0000000000ff";
    expect(
      await codigo(
        ctx,
        "core.actividades.create",
        nota({ vinculos: [{ tipo: "cuenta", id: salida }] }),
      ),
    ).toBe("NOT_FOUND");
    expect(
      await codigo(ctx, "core.actividades.create", nota({ vencimiento: "2026-12-01T12:00:00Z" })),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(ctx, "core.actividades.create", nota({ acuerdos: "Enviar propuesta" })),
    ).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.actividades.create", nota({ vinculos: [] }))).toBe(
      "INVALID_INPUT",
    );
    expect(
      await codigo(
        ctx,
        "core.actividades.create",
        nota({ tipo: "reunion", acuerdos: "Enviar propuesta" }),
      ),
    ).toBe("OK");
  });

  it("la tarea queda pendiente con el creador como responsable y completar es idempotente", async () => {
    const { ctx } = entorno();
    const t = await dato<{ id: string; estado: string; prioridad: string; responsables: string[] }>(
      ctx,
      "core.actividades.create",
      nota({ tipo: "tarea", vencimiento: "2026-12-01T12:00:00Z" }),
    );
    expect(t).toMatchObject({
      estado: "pendiente",
      prioridad: "media",
      responsables: [USUARIO_DE_PRUEBA.id],
    });
    const mias = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.tareas", {});
    expect(mias.items.map((i) => i.id)).toEqual([t.id]);
    const hecha = await dato<{ estado: string; completadaEn: string }>(
      ctx,
      "core.actividades.completar",
      { id: t.id },
    );
    const otra = await dato<{ completadaEn: string }>(ctx, "core.actividades.completar", {
      id: t.id,
    });
    expect(hecha.estado).toBe("hecha");
    expect(otra.completadaEn).toBe(hecha.completadaEn);
    expect(
      (await dato<{ items: unknown[] }>(ctx, "core.actividades.tareas", {})).items,
    ).toHaveLength(0);
  });

  it("un responsable sin membresía activa se rechaza", async () => {
    const { ctx } = entorno();
    const ajeno = "0192f3a0-0000-7000-8000-0000000000aa";
    expect(
      await codigo(ctx, "core.actividades.create", nota({ tipo: "tarea", responsables: [ajeno] })),
    ).toBe("NOT_FOUND");
  });

  it("solo el creador, owner o admin elimina; un agente necesita aprobación", async () => {
    const { ctx, tabla } = entorno();
    const a = await dato<{ id: string }>(ctx, "core.actividades.create", nota());
    const ajena = entorno("gerente");
    ajena.tabla("actividad").push(
      ...tabla("actividad").map((f) => ({
        ...f,
        creadaPorId: "0192f3a0-0000-7000-8000-0000000000bb",
      })),
    );
    expect(await codigo(ajena.ctx, "core.actividades.delete", { id: a.id })).toBe("FORBIDDEN");
    const agente = entorno("owner", true);
    const b = await dato<{ id: string }>(agente.ctx, "core.actividades.create", nota());
    expect(
      await executeCapability(agente.ctx, "core.actividades.delete", { id: b.id }, {}),
    ).toMatchObject({
      ok: false,
      error: { code: "APPROVAL_REQUIRED" },
    });
    await dato(ctx, "core.actividades.delete", { id: a.id });
    expect(tabla("actividad").map((f) => f["id"])).not.toContain(a.id);
  });
});

describe("core · etiquetas", () => {
  const crear = (ctx: ReturnType<typeof entorno>["ctx"], nombre: string) =>
    dato<{ id: string }>(ctx, "core.etiquetas.create", { nombre, tono: "info" });

  it("el catálogo es de owner y admin; gerente asigna pero no crea", async () => {
    const { ctx } = entorno("gerente");
    expect(await codigo(ctx, "core.etiquetas.create", { nombre: "VIP" })).toBe("FORBIDDEN");
    expect(await codigo(entorno("viewer").ctx, "core.etiquetas.list", {})).toBe("OK");
    expect(
      await codigo(entorno("viewer").ctx, "core.etiquetas.asignar", {
        entidadTipo: "cuenta",
        entidadIds: [CU],
        etiquetaIds: [CU],
      }),
    ).toBe("FORBIDDEN");
  });

  it("el nombre es único en el catálogo", async () => {
    const { ctx } = entorno();
    await crear(ctx, "Minería");
    expect(await codigo(ctx, "core.etiquetas.create", { nombre: "Minería" })).toBe("CONFLICT");
  });

  it("asigna en lote, es idempotente, quita y borra con su cuenta de asignaciones", async () => {
    const { ctx, tabla } = entorno();
    const e = await crear(ctx, "Minería");
    const entrada = { entidadTipo: "cuenta", entidadIds: [CU, CU2], etiquetaIds: [e.id] };
    expect(await dato(ctx, "core.etiquetas.asignar", entrada, { dryRun: true })).toEqual({
      asignadas: 2,
      yaEstaban: 0,
    });
    expect(tabla("etiquetaAsignacion") ?? []).toHaveLength(0);
    await dato(ctx, "core.etiquetas.asignar", entrada);
    expect(await dato(ctx, "core.etiquetas.asignar", entrada)).toEqual({
      asignadas: 0,
      yaEstaban: 2,
    });
    const de = await dato<{ nombre: string }[]>(ctx, "core.etiquetas.de_entidad", {
      entidadTipo: "cuenta",
      entidadId: CU,
    });
    expect(de.map((x) => x.nombre)).toEqual(["Minería"]);
    expect(await dato(ctx, "core.etiquetas.quitar", { ...entrada, entidadIds: [CU2] })).toEqual({
      quitadas: 1,
    });
    expect(await dato(ctx, "core.etiquetas.delete", { id: e.id }, { dryRun: true })).toMatchObject({
      asignacionesQuitadas: 1,
    });
    await dato(ctx, "core.etiquetas.delete", { id: e.id });
    expect(tabla("etiquetaAsignacion")).toHaveLength(0);
  });

  it("no asigna una etiqueta desactivada ni a una entidad inexistente", async () => {
    const { ctx } = entorno();
    const e = await crear(ctx, "Antigua");
    await dato(ctx, "core.etiquetas.update", { id: e.id, activa: false });
    expect(
      await codigo(ctx, "core.etiquetas.asignar", {
        entidadTipo: "negocio",
        entidadIds: [N1],
        etiquetaIds: [e.id],
      }),
    ).toBe("UNPROCESSABLE");
    await dato(ctx, "core.etiquetas.update", { id: e.id, activa: true });
    const fuera = "0192f3a0-0000-7000-8000-0000000000ff";
    expect(
      await codigo(ctx, "core.etiquetas.asignar", {
        entidadTipo: "negocio",
        entidadIds: [fuera],
        etiquetaIds: [e.id],
      }),
    ).toBe("NOT_FOUND");
  });

  it("un agente necesita aprobación para borrar una etiqueta", async () => {
    const { ctx } = entorno("owner", true);
    const e = await crear(ctx, "Temporal");
    expect(await executeCapability(ctx, "core.etiquetas.delete", { id: e.id }, {})).toMatchObject({
      ok: false,
      error: { code: "APPROVAL_REQUIRED" },
    });
  });
});
