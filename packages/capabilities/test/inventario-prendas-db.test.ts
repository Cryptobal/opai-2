// CAR-504 · Ropa ligada al uniforme contra Postgres real (rol sin BYPASSRLS): la prenda se valida contra el kit
// de la empresa, los sugeridos quedan ligados a su prenda y la talla propuesta sale de la ficha, con alcance.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

type Tipo = { id: string; nombre: string; prendaClave: string | null };

describe.skipIf(!urlPropietario)("inventario · ropa ligada al uniforme en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let persona = "";
  let personaB = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, alcance: string[] | null = null) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
    });

  async function empresa(slug: string) {
    const t = await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: ana, rol: "owner", portales: ["erp"] } });
    return t.id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    a = await empresa(`pre-a-${sufijo}`);
    b = await empresa(`pre-b-${sufijo}`);
    persona = (await e.admin.persona.create({ data: { tenantId: a, nombres: "Pedro", apellidos: "Soto", rut: "30000004-4" } })).id;
    personaB = (await e.admin.persona.create({ data: { tenantId: b, nombres: "Bea", apellidos: "Paz", rut: "30000005-2" } })).id;
    await e.admin.personaTalla.create({ data: { tenantId: a, personaId: persona, prenda: "camisa", talla: " l " } });
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("lista el kit de la vertical y rechaza una prenda fuera de él", async () => {
    const kit = await dato<{ items: { clave: string }[]; siguiente: string | null }>(ctx(a), "inventario.prendas.list", { limite: 2 });
    expect(kit.items.map((p) => p.clave)).toEqual(["camisa", "pantalon"]);
    expect(kit.siguiente).toBe("pantalon");
    expect(await codigo(ctx(a), "inventario.prendas.list", { cursor: "no_existe" })).toBe("UNPROCESSABLE");
    const fuera = { categoria: "ropa", nombre: "Gorro", tallas: ["U"], prendaClave: "gorro" };
    expect(await codigo(ctx(a), "inventario.tipos.crear", fuera)).toBe("UNPROCESSABLE");
  });

  it("los sugeridos de ropa quedan ligados a su prenda del uniforme", async () => {
    await dato(ctx(a), "inventario.tipos.cargar_sugeridos", {});
    const tipos = await dato<{ items: Tipo[] }>(ctx(a), "inventario.tipos.list", { categoria: "ropa" });
    expect(tipos.items.find((t) => t.nombre === "Camisa")?.prendaClave).toBe("camisa");
    expect(tipos.items.every((t) => t.prendaClave)).toBe(true);
  });

  it("propone la talla de la ficha; nula sin prenda o sin talla; otra empresa o fuera del alcance no", async () => {
    const tipos = await dato<{ items: Tipo[] }>(ctx(a), "inventario.tipos.list", { categoria: "ropa" });
    const camisa = tipos.items.find((t) => t.prendaClave === "camisa")?.id;
    const pantalon = tipos.items.find((t) => t.prendaClave === "pantalon")?.id;
    const talla = (tipoId: string | undefined, personaId = persona) =>
      dato<{ talla: string | null }>(ctx(a), "inventario.entregas.talla_persona", { tipoId, personaId });
    expect((await talla(camisa)).talla).toBe("L");
    expect((await talla(pantalon)).talla).toBeNull();
    const suelta = await dato<Tipo>(ctx(a), "inventario.tipos.crear", { categoria: "ropa", nombre: "Gorro", tallas: ["U"] });
    expect((await talla(suelta.id)).talla).toBeNull();
    expect(await codigo(ctx(a), "inventario.entregas.talla_persona", { tipoId: camisa, personaId: personaB })).toBe("NOT_FOUND");
    expect(await codigo(ctx(a, []), "inventario.entregas.talla_persona", { tipoId: camisa, personaId: persona })).toBe("NOT_FOUND");
    const auditada = await e.admin.auditEvent.count({ where: { tenantId: a, capability: "inventario.entregas.talla_persona" } });
    expect(auditada).toBeGreaterThan(0);
  });
});
