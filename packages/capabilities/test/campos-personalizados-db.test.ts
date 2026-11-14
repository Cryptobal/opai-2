import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

type Campo = { id: string; clave: string; orden: number; opciones: string[]; activo: boolean };
type Lista = { items: Campo[]; siguiente: string | null };

// Catálogo de campos personalizados (CAR-27, PR 1) contra Postgres real (RLS sin BYPASSRLS).
// Datos ficticios.
describe("core · campos personalizados contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let userId = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (tenantId: string, rol = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`campos-a-${sufijo}`)).id;
    b = (await nuevo(`campos-b-${sufijo}`)).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("crea con clave estable y orden correlativo; la vista previa no escribe", async () => {
    const previa = await dato<Campo>(
      ctx(a),
      "core.campos_personalizados.create",
      { entidad: "cuenta", etiqueta: "Rubro", tipo: "texto" },
      { dryRun: true },
    );
    expect(previa.clave).toBe("rubro");
    const vacia = await dato<Lista>(ctx(a), "core.campos_personalizados.list", {});
    expect(vacia.items).toHaveLength(0);

    const c1 = await dato<Campo>(ctx(a), "core.campos_personalizados.create", {
      entidad: "cuenta",
      etiqueta: "Rubro",
      tipo: "texto",
    });
    const c2 = await dato<Campo>(ctx(a), "core.campos_personalizados.create", {
      entidad: "cuenta",
      etiqueta: "Tamaño",
      tipo: "lista",
      opciones: [" Grande ", "Chica", "grande"],
    });
    expect([c1.orden, c2.orden]).toEqual([0, 1]);
    expect(c2.clave).toBe("tamano");
    expect(c2.opciones).toEqual(["Grande", "Chica"]);
  });

  it("rechaza duplicados, listas sin opciones y roles sin permiso de configurar", async () => {
    const entrada = { entidad: "cuenta", etiqueta: "rubro", tipo: "numero" };
    expect(await codigo(ctx(a), "core.campos_personalizados.create", entrada)).toBe("CONFLICT");
    expect(
      await codigo(ctx(a), "core.campos_personalizados.create", {
        entidad: "negocio",
        etiqueta: "Canal",
        tipo: "lista",
        opciones: ["  "],
      }),
    ).toBe("UNPROCESSABLE");
    expect(
      await codigo(ctx(a, "viewer"), "core.campos_personalizados.create", {
        entidad: "negocio",
        etiqueta: "Canal",
        tipo: "texto",
      }),
    ).toBe("FORBIDDEN");
  });

  it("aísla por empresa y archiva sin borrar", async () => {
    const lista = await dato<Lista>(ctx(a), "core.campos_personalizados.list", { entidad: "cuenta" });
    const rubro = lista.items.find((c) => c.clave === "rubro");
    expect(rubro).toBeDefined();
    if (!rubro) return;

    expect((await dato<Lista>(ctx(b), "core.campos_personalizados.list", {})).items).toHaveLength(0);
    expect(
      await codigo(ctx(b), "core.campos_personalizados.update", { id: rubro.id, activo: false }),
    ).toBe("NOT_FOUND");

    await dato(ctx(a), "core.campos_personalizados.update", { id: rubro.id, activo: false });
    const activos = await dato<Lista>(ctx(a), "core.campos_personalizados.list", {});
    expect(activos.items.map((c) => c.clave)).not.toContain("rubro");
    const todos = await dato<Lista>(ctx(a), "core.campos_personalizados.list", {
      incluirArchivados: true,
    });
    expect(todos.items.map((c) => c.clave)).toContain("rubro");
  });

  it("pagina con cursor", async () => {
    const p1 = await dato<Lista>(ctx(a), "core.campos_personalizados.list", {
      incluirArchivados: true,
      limite: 1,
    });
    expect(p1.items).toHaveLength(1);
    expect(p1.siguiente).not.toBeNull();
    const p2 = await dato<Lista>(ctx(a), "core.campos_personalizados.list", {
      incluirArchivados: true,
      limite: 1,
      cursor: p1.siguiente ?? undefined,
    });
    expect(p2.items[0]?.id).not.toBe(p1.items[0]?.id);
  });
});
