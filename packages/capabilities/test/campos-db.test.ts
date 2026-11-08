// CAR-138 PR 2 · resolvedor autorizado del catálogo de campos, contra Postgres real (si hay
// DATABASE_URL_TEST): permisos, alcance del supervisor, finalidad y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Salida = {
  campos: Record<string, unknown>;
  colecciones: { instalaciones: Record<string, unknown>[] };
  sinPermiso: string[];
  sinResolvedor: string[];
  origen: { instalacionIds: string[] };
};

describe.skipIf(!urlPropietario)("Campos · resolvedor autorizado en base real", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tA = "";
  let tB = "";
  let cuenta = "";
  let ana = "";
  let norte = "";
  let sur = "";
  const sufijo = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };

  type Rol = "owner" | "viewer" | "supervisor";
  const ctx = (tenantId: string, rol: Rol = "owner", instalaciones?: string[]) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: [],
      medidor,
      ...(instalaciones ? { alcance: { instalaciones } } : {}),
    });
  const resolver = (t: string, input: unknown, rol: Rol = "owner", inst?: string[]) =>
    mod.executeCapability(ctx(t, rol, inst), "core.campos.valores", input);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${slug}-${sufijo}`, nombre: slug, vertical: "seguridad" },
        })
      ).id;
    tA = await tenant("cmp-a");
    tB = await tenant("cmp-b");
    cuenta = (
      await e.admin.cuenta.create({
        data: {
          tenantId: tA,
          nombre: "Logística Andina SpA",
          rut: "77.000.000-0",
          giro: "Logística",
        },
      })
    ).id;
    ana = (
      await e.admin.contacto.create({
        data: {
          tenantId: tA,
          cuentaId: cuenta,
          nombres: "Ana",
          apellidos: "Prueba",
          email: `ana-${sufijo}@prueba.cl`,
        },
      })
    ).id;
    const inst = async (nombre: string, extra: Record<string, unknown> = {}) =>
      (
        await e.admin.instalacion.create({
          data: { tenantId: tA, cuentaId: cuenta, nombre, comuna: "Quilicura", ...extra },
        })
      ).id;
    norte = await inst("Planta Norte");
    sur = await inst("Planta Sur");
    await inst("Planta Vieja", { archivadaEn: new Date() });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("entrega los campos de la finalidad con las instalaciones vigentes y sin inventar faltantes", async () => {
    const r = await resolver(tA, { finalidad: "propuesta", cuentaId: cuenta, contactoId: ana });
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as Salida) : ({} as Salida);
    expect(d.campos["cuenta.nombre"]).toBe("Logística Andina SpA");
    expect(d.campos["contacto.nombre"]).toBe("Ana Prueba");
    expect(d.campos["cuenta.giro"]).toBe("Logística");
    expect(d.colecciones.instalaciones.map((i) => i["instalacion.nombre"])).toEqual([
      "Planta Norte",
      "Planta Sur",
    ]);
    expect(d.colecciones.instalaciones[0]?.["instalacion.mapa_url"]).toBeNull();
  });

  it("el RUT del cliente solo sale en contrato, no en una propuesta", async () => {
    const prop = await resolver(tA, { finalidad: "propuesta", cuentaId: cuenta });
    const contr = await resolver(tA, { finalidad: "contrato", cuentaId: cuenta });
    expect(prop.ok && (prop.data as Salida).campos["cuenta.rut"]).toBe(undefined);
    expect(contr.ok && (contr.data as Salida).campos["cuenta.rut"]).toBe("77.000.000-0");
  });

  it("limita a las instalaciones pedidas y rechaza una que no es de la cuenta", async () => {
    const una = await resolver(tA, {
      finalidad: "propuesta",
      cuentaId: cuenta,
      instalacionIds: [sur],
    });
    expect(una.ok && (una.data as Salida).origen.instalacionIds).toEqual([sur]);
    const mala = await resolver(tA, {
      finalidad: "propuesta",
      cuentaId: cuenta,
      instalacionIds: [randomUUID()],
    });
    expect(mala.ok).toBe(false);
  });

  it("un supervisor solo recibe las instalaciones a su cargo", async () => {
    const r = await resolver(tA, { finalidad: "propuesta", cuentaId: cuenta }, "supervisor", [
      norte,
    ]);
    const d = r.ok ? (r.data as Salida) : ({} as Salida);
    expect(d.origen?.instalacionIds).toEqual([norte]);
    const ajena = await resolver(
      tA,
      { finalidad: "propuesta", cuentaId: cuenta, instalacionIds: [sur] },
      "supervisor",
      [norte],
    );
    expect(ajena.ok).toBe(false);
    const sinAlcance = await resolver(
      tA,
      { finalidad: "propuesta", cuentaId: cuenta },
      "supervisor",
      [],
    );
    expect(sinAlcance.ok).toBe(false);
  });

  it("otra empresa no ve la cuenta ni su contacto", async () => {
    const otra = await resolver(tB, { finalidad: "propuesta", cuentaId: cuenta });
    expect(otra.ok).toBe(false);
    const cruzado = await resolver(tB, {
      finalidad: "propuesta",
      cuentaId: cuenta,
      contactoId: ana,
    });
    expect(cruzado.ok).toBe(false);
  });

  it("resuelve un contacto vinculado a otra cuenta con el cargo de esa cuenta y rechaza uno sin vínculo", async () => {
    const otra = (
      await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Cuenta Vinculada" } })
    ).id;
    const ajena = (
      await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Cuenta Sin Vínculo" } })
    ).id;
    await e.admin.contactoCuenta.create({
      data: { tenantId: tA, contactoId: ana, cuentaId: otra, cargo: "Gerente de Operaciones" },
    });
    const ok = await resolver(tA, { finalidad: "propuesta", cuentaId: otra, contactoId: ana });
    expect(ok.ok && (ok.data as Salida).campos["contacto.cargo"]).toBe("Gerente de Operaciones");
    const no = await resolver(tA, { finalidad: "propuesta", cuentaId: ajena, contactoId: ana });
    expect(no.ok).toBe(false);
  });

  it("con más de 50 instalaciones exige elegir cuáles incluir en vez de truncar en silencio", async () => {
    const grande = (
      await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Cuenta Grande" } })
    ).id;
    await e.admin.instalacion.createMany({
      data: Array.from({ length: 51 }, (_, i) => ({
        tenantId: tA,
        cuentaId: grande,
        nombre: `Sitio ${String(i).padStart(2, "0")}`,
      })),
    });
    const sin = await resolver(tA, { finalidad: "propuesta", cuentaId: grande });
    expect(sin.ok).toBe(false);
    const una = await e.admin.instalacion.findFirst({ where: { cuentaId: grande } });
    const con = await resolver(tA, {
      finalidad: "propuesta",
      cuentaId: grande,
      instalacionIds: [una?.id ?? ""],
    });
    expect(con.ok && (con.data as Salida).colecciones.instalaciones).toHaveLength(1);
  });

  it("el catálogo se filtra por permiso y se ve completo para el dueño", async () => {
    const r = await mod.executeCapability(ctx(tA), "core.campos.catalogo", {
      finalidad: "contrato",
    });
    const d = r.ok ? (r.data as { campos: { clave: string }[]; sinResolvedor: string[] }) : null;
    expect(d?.campos.map((c) => c.clave)).toContain("cuenta.rut");
    expect(d?.sinResolvedor.some((c) => c.startsWith("persona."))).toBe(true);
  });
});
