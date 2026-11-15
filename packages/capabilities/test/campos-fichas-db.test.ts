import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE as P } from "@opai/domain";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

type Campo = { clave: string; valor: unknown; opciones: { valor: string; etiqueta: string }[] };
type Valores = { campos: Campo[] };
type Definicion = { opciones: unknown; formato: string | null; valorDefecto: unknown; descripcion: string | null };
type Lista = { items: { entidad: string }[]; entidades: { valor: string }[] };
const valor = (v: Valores, clave: string) => v.campos.find((c) => c.clave === clave)?.valor;

// CAR-536: campos personalizados en instalaciones y personas, tipos nuevos, usuario de la empresa,
// permiso por ficha y fichas según módulos activos, contra Postgres real. Datos ficticios.
describe("core · campos personalizados en todas las fichas contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let userId = "";
  let instalacion = "";
  let persona = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = (opc: { modulos?: string[]; permisos?: string[] } = {}) =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      ...(opc.permisos ? { permisosRol: opc.permisos } : {}),
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: opc.modulos ?? ["comercial"],
    });
  const crear = (entrada: Record<string, unknown>) =>
    dato<Definicion>(ctx(), "core.campos_personalizados.create", entrada);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    a = (await e.admin.tenant.create({ data: { slug: `fichas-${sufijo}`, nombre: "QA", vertical: "seguridad" } })).id;
    userId = (
      await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    await e.admin.membership.create({ data: { tenantId: a, userId, rol: "owner", portales: ["erp"] } });
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cuenta QA" } });
    instalacion = (
      await e.admin.instalacion.create({ data: { tenantId: a, cuentaId: cuenta.id, nombre: "Sitio QA" } })
    ).id;
    persona = (
      await e.admin.persona.create({ data: { tenantId: a, nombres: "Pía", apellidos: "Prueba", rut: "11111111-1" } })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("define opciones con etiqueta y valor, formato, ayuda y valor por defecto", async () => {
    const turno = await crear({
      entidad: "instalacion",
      etiqueta: "Turnos",
      tipo: "multiple",
      descripcion: "Turnos que cubre el sitio",
      opciones: [{ valor: "dia", etiqueta: "Día" }, { etiqueta: "Noche" }],
      valorDefecto: ["dia"],
      formato: "entero",
    });
    expect(turno.opciones).toEqual([
      { valor: "dia", etiqueta: "Día" },
      { valor: "Noche", etiqueta: "Noche" },
    ]);
    expect([turno.formato, turno.valorDefecto, turno.descripcion]).toEqual([null, ["dia"], "Turnos que cubre el sitio"]);
    await crear({ entidad: "instalacion", etiqueta: "Tarifa", tipo: "numero", formato: "moneda_clp" });
    await crear({ entidad: "instalacion", etiqueta: "Encargado", tipo: "usuario" });
    await crear({ entidad: "persona", etiqueta: "RUT contacto emergencia", tipo: "rut" });
    await crear({ entidad: "persona", etiqueta: "Sitio web", tipo: "url" });
    const sinOpciones = { entidad: "persona", etiqueta: "Talla", tipo: "radio", opciones: [] };
    expect(await codigo(ctx(), "core.campos_personalizados.create", sinOpciones)).toBe("UNPROCESSABLE");
    const malDefecto = { entidad: "persona", etiqueta: "Correo", tipo: "email", valorDefecto: "x" };
    expect(await codigo(ctx(), "core.campos_personalizados.create", malDefecto)).toBe("UNPROCESSABLE");
  });

  it("guarda y valida valores en la ficha de instalación", async () => {
    const id = { entidad: "instalacion", id: instalacion };
    await dato(ctx(), "core.valores_personalizados.set", {
      ...id,
      valores: { turnos: ["Noche", "dia"], tarifa: "150000", encargado: userId },
    });
    const v = await dato<Valores>(ctx(), "core.valores_personalizados.get", id);
    expect([valor(v, "turnos"), valor(v, "tarifa"), valor(v, "encargado")]).toEqual([["dia", "Noche"], 150000, userId]);
    expect(v.campos.find((c) => c.clave === "encargado")?.opciones).toEqual([{ valor: userId, etiqueta: "Ana" }]);
    const set = (valores: Record<string, unknown>) => codigo(ctx(), "core.valores_personalizados.set", { ...id, valores });
    expect(await set({ tarifa: 10.5 })).toBe("UNPROCESSABLE");
    expect(await set({ encargado: randomUUID() })).toBe("UNPROCESSABLE");
    expect(await set({ turnos: ["Tarde"] })).toBe("UNPROCESSABLE");
  });

  it("guarda RUT y URL normalizados en la ficha de persona y exige el permiso de personas", async () => {
    const id = { entidad: "persona", id: persona };
    await dato(ctx(), "core.valores_personalizados.set", {
      ...id,
      valores: { rut_contacto_emergencia: "22.222.222-2", sitio_web: "ejemplo.cl" },
    });
    const v = await dato<Valores>(ctx(), "core.valores_personalizados.get", id);
    expect([valor(v, "rut_contacto_emergencia"), valor(v, "sitio_web")]).toEqual(["22222222-2", "https://ejemplo.cl/"]);
    const soloCuentas = ctx({ permisos: [P.cuentasRead, P.cuentasManage] });
    expect(await codigo(soloCuentas, "core.valores_personalizados.get", id)).toBe("FORBIDDEN");
    const soloPersonas = ctx({ permisos: [P.personasRead] });
    expect((await dato<Valores>(soloPersonas, "core.valores_personalizados.get", id)).campos).toHaveLength(2);
  });

  it("solo ofrece las fichas de módulos activos", async () => {
    const sinComercial = ctx({ modulos: [] });
    const lista = await dato<Lista>(sinComercial, "core.campos_personalizados.list", {});
    expect(lista.entidades.map((x) => x.valor)).toEqual(["cuenta", "contacto", "instalacion", "persona"]);
    const negocio = { entidad: "negocio", etiqueta: "Canal", tipo: "texto" };
    expect(await codigo(sinComercial, "core.campos_personalizados.create", negocio)).toBe("FORBIDDEN");
    await crear(negocio);
    const conNegocio = await dato<Lista>(sinComercial, "core.campos_personalizados.list", {});
    expect(conNegocio.items.map((x) => x.entidad)).not.toContain("negocio");
  });
});
