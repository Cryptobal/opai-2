// CAR-138 PR 9 · Importación de HTML de propuesta contra Postgres real: saneado, versionado por empresa,
// rechazo sin guardar, aislamiento entre empresas e inmutabilidad del HTML guardado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type Imp = {
  guardada: boolean; sinCambios: boolean; version: number | null; id: string | null; hash: string | null;
  problemas: { codigo: string }[]; tokens: { usados: string[] };
};
type Fila = { id: string; version: number; estado: string };

const HTML_A = '<section style="padding: 8px"><h1>Propuesta para {{cuenta.nombre}}</h1>{{#cada instalaciones}}<p>{{instalacion.nombre}}</p>{{/cada}}</section>';
const HTML_B = `${HTML_A}<footer>Gracias</footer>`;

describe.skipIf(!urlPropietario)("cpq · plantilla HTML de propuesta en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t1: string;
  let t2: string;
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const run = <T>(tenantId: string, id: string, input: unknown, rol: "owner" | "supervisor" = "owner", dryRun = false) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId, actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["comercial", "cpq"], medidor,
      }),
      id, input, { dryRun },
    ) as Promise<Res<T>>;
  const importar = (t: string, nombre: string, html: string, dryRun = false) => run<Imp>(t, "cpq.propuestas_html.importar", { nombre, html }, "owner", dryRun);
  const lista = async (t: string) => {
    const r = await run<{ plantillas: Fila[] }>(t, "cpq.propuestas_html.list", {});
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data.plantillas;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    for (const n of ["a", "b"]) {
      const t = await e.admin.tenant.create({ data: { slug: `html-${n}-${randomUUID().slice(0, 8)}`, nombre: `Empresa ${n}`, vertical: "seguridad" } });
      await sembrarComercial(e.admin.$extends({}), t.id);
      if (n === "a") t1 = t.id;
      else t2 = t.id;
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la simulación sanea y no guarda nada", async () => {
    const r = await importar(t1, "Base", HTML_A, true);
    expect(r.ok && r.data).toMatchObject({ guardada: false, version: 1, problemas: [] });
    expect(await lista(t1)).toHaveLength(0);
  });

  it("guarda la versión 1; el mismo HTML no crea otra; un cambio crea la 2 y archiva la 1", async () => {
    const a = await importar(t1, "Base", HTML_A);
    expect(a.ok && a.data).toMatchObject({ guardada: true, version: 1 });
    if (a.ok) expect(a.data.tokens.usados).toEqual(expect.arrayContaining(["cuenta.nombre", "instalacion.nombre"]));
    const otra = await importar(t1, "Base", HTML_A);
    expect(otra.ok && otra.data).toMatchObject({ guardada: false, sinCambios: true, version: 1 });
    const b = await importar(t1, "Base", HTML_B);
    expect(b.ok && b.data).toMatchObject({ guardada: true, version: 2 });
    const filas = await lista(t1);
    expect(filas.map((f) => [f.version, f.estado])).toEqual([[2, "activa"], [1, "archivada"]]);
  });

  it("lo peligroso se rechaza completo y no se guarda", async () => {
    const antes = (await lista(t1)).length;
    const r = await importar(t1, "Malo", `${HTML_A}<script>alert(1)</script><img src="https://x.cl/a.png">`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.guardada).toBe(false);
    expect(r.data.problemas.map((p) => p.codigo)).toEqual(expect.arrayContaining(["elemento_activo", "recurso_externo"]));
    const t = await importar(t1, "Token", "<p>{{cuenta.inventado}}</p>");
    expect(t.ok && t.data.problemas.map((p) => p.codigo)).toContain("token");
    expect((await lista(t1)).length).toBe(antes);
  });

  it("la otra empresa no ve ni mezcla versiones", async () => {
    expect(await lista(t2)).toHaveLength(0);
    const r = await importar(t2, "Base", HTML_A);
    expect(r.ok && r.data).toMatchObject({ guardada: true, version: 1 });
    const mias = await lista(t1);
    const ajena = mias.find((f) => f.version === 2);
    const g = await run<{ id: string }>(t2, "cpq.propuestas_html.get", { id: ajena?.id ?? randomUUID() });
    expect(g.ok).toBe(false);
  });

  it("get devuelve el HTML saneado; el HTML guardado es inmutable", async () => {
    const act = (await lista(t1)).find((f) => f.estado === "activa");
    const g = await run<{ html: string; hash: string }>(t1, "cpq.propuestas_html.get", { id: act?.id });
    expect(g.ok && g.data.html).toBe(HTML_B);
    // Lecturas auditadas (NÚCLEO-H): get y list registran solo los IDs revelados, en la empresa que lee.
    for (const cap of ["cpq.propuestas_html.get", "cpq.propuestas_html.list"]) {
      const ev = await e.admin.auditEvent.findFirstOrThrow({ where: { tenantId: t1, capability: cap }, orderBy: { seq: "desc" } });
      expect(JSON.stringify(ev.payload)).toContain(act?.id ?? "x");
      expect(JSON.stringify(ev.payload)).not.toContain("<");
    }
    await expect(e.admin.cpqPropuestaHtml.update({ where: { id: act?.id ?? "" }, data: { htmlSaneado: "<b>otro</b>" } })).rejects.toThrow();
    await expect(e.admin.cpqPropuestaHtml.update({ where: { id: act?.id ?? "" }, data: { estado: "archivada" } })).resolves.toBeTruthy();
  });

  it("sin permiso de biblioteca no se puede importar", async () => {
    const r = await run<Imp>(t1, "cpq.propuestas_html.importar", { nombre: "X", html: HTML_A }, "supervisor");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });
});
