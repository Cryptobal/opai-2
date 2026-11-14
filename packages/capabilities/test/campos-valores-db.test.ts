import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

type Valores = { campos: { clave: string; valor: unknown; obligatorio: boolean }[] };
const valor = (v: Valores, clave: string) => v.campos.find((c) => c.clave === clave)?.valor;

// Valores de campos personalizados en fichas (CAR-27, PR 2) contra Postgres real. Datos ficticios.
describe("core · valores de campos personalizados contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let userId = "";
  let cuenta = "";
  let negocio = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
    });
  const campo = (tenantId: string, entidad: string, etiqueta: string, tipo: string, extra = {}) =>
    dato(ctx(tenantId), "core.campos_personalizados.create", { entidad, etiqueta, tipo, ...extra });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`valores-a-${sufijo}`)).id;
    b = (await nuevo(`valores-b-${sufijo}`)).id;
    await sembrarComercial(e.admin.$extends({}), a);
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: a, userId, rol: "owner", portales: ["erp"] },
    });
    cuenta = (await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cuenta Alfa" } })).id;
    const etapa = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: a, tipo: "abierta" } });
    negocio = (
      await e.admin.negocio.create({
        data: {
          tenantId: a,
          cuentaId: cuenta,
          embudoId: etapa.embudoId,
          etapaId: etapa.id,
          titulo: "Negocio de prueba",
          responsableId: userId,
          valorMensual: 0,
        },
      })
    ).id;
    await campo(a, "cuenta", "Rubro", "lista", { opciones: ["Minería", "Retail"] });
    await campo(a, "cuenta", "Dotación", "numero");
    await campo(a, "cuenta", "Código interno", "texto", { obligatorio: true });
    await campo(a, "negocio", "Canal", "texto");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("lee vacío, guarda solo lo enviado y borra con null", async () => {
    const id = { entidad: "cuenta", id: cuenta };
    const inicio = await dato<Valores>(ctx(a), "core.valores_personalizados.get", id);
    expect(inicio.campos.map((c) => c.valor)).toEqual([null, null, null]);

    const previa = await dato<Valores>(
      ctx(a),
      "core.valores_personalizados.set",
      { ...id, valores: { rubro: "Minería" } },
      { dryRun: true },
    );
    expect(valor(previa, "rubro")).toBe("Minería");
    const sin = await dato<Valores>(ctx(a), "core.valores_personalizados.get", id);
    expect(valor(sin, "rubro")).toBeNull();

    await dato(ctx(a), "core.valores_personalizados.set", {
      ...id,
      valores: { rubro: "Minería", dotacion: "12,5", codigo_interno: "A-1" },
    });
    await dato(ctx(a), "core.valores_personalizados.set", {
      ...id,
      valores: { dotacion: null },
    });
    const fin = await dato<Valores>(ctx(a), "core.valores_personalizados.get", id);
    expect([valor(fin, "rubro"), valor(fin, "dotacion"), valor(fin, "codigo_interno")]).toEqual([
      "Minería",
      null,
      "A-1",
    ]);
  });

  it("rechaza valores inválidos, claves de otra entidad y vaciar un obligatorio", async () => {
    const set = (valores: Record<string, unknown>) =>
      codigo(ctx(a), "core.valores_personalizados.set", {
        entidad: "cuenta",
        id: cuenta,
        valores,
      });
    expect(await set({ rubro: "Pesca" })).toBe("UNPROCESSABLE");
    expect(await set({ canal: "Web" })).toBe("UNPROCESSABLE");
    expect(await set({ codigo_interno: null })).toBe("UNPROCESSABLE");
  });

  it("negocios con permisos de Comercial; aislamiento y rol sin permiso", async () => {
    await dato(ctx(a), "comercial.negocio_campos.set", {
      negocioId: negocio,
      valores: { canal: "Referido" },
    });
    const v = await dato<Valores>(ctx(a), "comercial.negocio_campos.get", { negocioId: negocio });
    expect(valor(v, "canal")).toBe("Referido");

    expect(
      await codigo(ctx(b), "core.valores_personalizados.get", { entidad: "cuenta", id: cuenta }),
    ).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "comercial.negocio_campos.get", { negocioId: negocio })).toBe(
      "NOT_FOUND",
    );
    expect(
      await codigo(ctx(a, "viewer"), "core.valores_personalizados.set", {
        entidad: "cuenta",
        id: cuenta,
        valores: { rubro: "Retail" },
      }),
    ).toBe("FORBIDDEN");
  });
});
