// CAR-48: prueba de dos empresas generada desde el catálogo. Para TODA tabla con `tenant_id`, en
// todos los schemas, siembra una fila en A y otra en B y verifica, como `opai_app` con A fijado, que
// SELECT, UPDATE y DELETE sobre B tocan 0 filas y que un INSERT hacia B se rechaza. Una tabla nueva
// queda cubierta sola; si la siembra genérica no le sirve, la prueba falla hasta agregar su ajuste.
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";
import { paresMismoTenant, type Tabla } from "./dos-empresas/catalogo";
import { limpiarClaves, type Siembra, sembrar } from "./dos-empresas/siembra";
import {
  columnasActualizables,
  comoTenant,
  copia,
  privilegio,
  sqlInsert,
} from "./dos-empresas/sql";

const ROL = "opai_app";
// En los controles, un índice único formado solo por tenant y referencias choca con la fila original:
// llegar a ese error ya prueba que la política y los triggers aceptaron la fila (van antes del índice).
const UNICO = "23505";
const EXCL = "23P01";
// Mensaje de `core.verificar_mismo_tenant`. En su control basta que el error, si lo hay, venga de
// después (un CHECK, otro trigger o un único): la referencia de la misma empresa ya pasó.
const OTRA = /apunta a una fila de otra empresa o inexistente/;
// En comercial, `misma_cuenta` y `derivar_estado` corren antes (orden alfabético de triggers) y
// rechazan con su mensaje una referencia que no es de la empresa fijada. `usuario_miembro` (CAR-46)
// busca la membresía con la RLS de la empresa fijada: la del usuario de B no es visible desde A.
const RECHAZO = new RegExp(
  `${OTRA.source}|no pertenece a la cuenta del negocio|no visible para el tenant actual|no es miembro de la empresa`,
);

describe.skipIf(!urlPropietario)("dos empresas: aislamiento de toda tabla con tenant_id", () => {
  let e: Entorno;
  let admin: Client;
  let app: Client;
  let s: Siembra;
  const t = { a: "", b: "" };
  const sufijo = randomUUID().slice(0, 8);

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    t.a = (await nuevo(`dos-a-${sufijo}`)).id;
    t.b = (await nuevo(`dos-b-${sufijo}`)).id;
    admin = new Client({ connectionString: urlPropietario });
    app = new Client({ connectionString: process.env["DATABASE_URL"] });
    await admin.connect();
    await app.connect();
    s = await sembrar(admin, t);
  });

  afterAll(async () => {
    await app?.end();
    if (admin) await limpiarClaves(admin, [t.a, t.b]);
    await admin?.end();
    await e?.cerrar();
  });

  const tablas = () => [...s.tablas.values()];

  it("siembra una fila en A y otra en B de cada tabla, en todos los schemas", () => {
    expect(Object.fromEntries(s.errores)).toEqual({});
    const schemas = new Set(tablas().map((x) => x.nombre.split(".")[0]));
    expect([...schemas]).toEqual(expect.arrayContaining(["core", "comercial"]));
    const sinFilas = tablas().filter((x) => !s.filas.a.has(x.nombre) || !s.filas.b.has(x.nombre));
    expect(sinFilas.map((x) => x.nombre)).toEqual([]);
  });

  it("SELECT con A fijado ve su fila y ninguna de B", async () => {
    const malas: string[] = [];
    for (const x of tablas()) {
      if (!(await privilegio(admin, ROL, x.nombre, "SELECT"))) continue;
      const otras = await comoTenant(app, t.a, `SELECT 1 FROM ${x.nombre} WHERE tenant_id <> $1`, [
        t.a,
      ]);
      const propias = await comoTenant(app, t.a, `SELECT 1 FROM ${x.nombre} WHERE tenant_id = $1`, [
        t.a,
      ]);
      if (otras.codigo || otras.filas > 0 || propias.filas < 1)
        malas.push(`${x.nombre}: ${JSON.stringify({ otras, propias })}`);
    }
    expect(malas).toEqual([]);
  });

  it("UPDATE con A fijado no toca filas de B ni mueve una fila propia a B", async () => {
    const malas: string[] = [];
    for (const x of tablas()) {
      const cols = await columnasActualizables(admin, ROL, x);
      const col = cols.includes("tenant_id") ? "tenant_id" : cols[0];
      if (!col) continue;
      const cruzado = await comoTenant(
        app,
        t.a,
        `UPDATE ${x.nombre} SET "${col}" = "${col}" WHERE tenant_id = $1`,
        [t.b],
      );
      if (cruzado.filas !== 0 || (cruzado.codigo && cruzado.codigo !== "42501"))
        malas.push(`${x.nombre} cruzado: ${JSON.stringify(cruzado)}`);
      if (col !== "tenant_id" || !s.filas.a.has(x.nombre)) continue;
      const mover = await comoTenant(
        app,
        t.a,
        `UPDATE ${x.nombre} SET tenant_id = $1 WHERE tenant_id = $2`,
        [t.b, t.a],
      );
      if (!mover.codigo) malas.push(`${x.nombre}: una fila de A pasó a B`);
    }
    expect(malas).toEqual([]);
  });

  it("DELETE con A fijado no borra filas de B", async () => {
    const malas: string[] = [];
    for (const x of tablas()) {
      if (!(await privilegio(admin, ROL, x.nombre, "DELETE"))) continue;
      const r = await comoTenant(app, t.a, `DELETE FROM ${x.nombre} WHERE tenant_id = $1`, [t.b]);
      if (r.filas !== 0 || r.codigo) malas.push(`${x.nombre}: ${JSON.stringify(r)}`);
    }
    expect(malas).toEqual([]);
  });

  it("INSERT hacia B con A fijado se rechaza (la misma fila sí entra con B fijado)", async () => {
    const malas: string[] = [];
    for (const x of tablas()) {
      const filaB = s.filas.b.get(x.nombre);
      if (!filaB) continue;
      const { sql, params } = sqlInsert(x.nombre, copia(x, filaB));
      const cruzado = await comoTenant(app, t.a, sql, params);
      // 42501 es la política (o falta de privilegio); 23503 solo vale si lo lanza un trigger de
      // misma empresa, que corre antes del WITH CHECK porque la referencia de B no es visible.
      const rechazo =
        cruzado.codigo === "42501" ||
        (cruzado.codigo === "23503" && RECHAZO.test(cruzado.mensaje ?? ""));
      if (!rechazo) malas.push(`${x.nombre} desde A: ${JSON.stringify(cruzado)}`);
      if (!(await privilegio(admin, ROL, x.nombre, "INSERT"))) continue;
      const propio = await comoTenant(app, t.b, sql, params);
      if (propio.codigo && propio.codigo !== UNICO && propio.codigo !== EXCL)
        malas.push(`${x.nombre} control con B: ${propio.mensaje}`);
    }
    expect(malas).toEqual([]);
  });

  it("ninguna referencia entre tablas con tenant_id apunta a otra empresa (triggers mismo_tenant)", async () => {
    const pares = await paresMismoTenant(admin);
    expect(pares.length).toBeGreaterThanOrEqual(30);
    const malas: string[] = [];
    for (const p of pares) {
      const x = s.tablas.get(p.origen) as Tabla;
      const filaA = s.filas.a.get(p.origen);
      const refB = s.filas.b.get(p.tabla)?.["id"];
      const refA = s.filas.a.get(p.tabla)?.["id"];
      if (!x || !filaA || !refA || !refB) {
        malas.push(`${p.origen}.${p.columna}: sin filas sembradas para probar`);
        continue;
      }
      const malo = sqlInsert(p.origen, copia(x, filaA, { [p.columna]: refB }));
      const r = await comoTenant(admin, t.a, malo.sql, malo.params);
      if (r.codigo !== "23503" || !RECHAZO.test(r.mensaje ?? ""))
        malas.push(`${p.origen}.${p.columna} → B: ${JSON.stringify(r)}`);
      const bueno = sqlInsert(p.origen, copia(x, filaA, { [p.columna]: refA }));
      const ok = await comoTenant(admin, t.a, bueno.sql, bueno.params);
      if (ok.codigo && OTRA.test(ok.mensaje ?? ""))
        malas.push(`${p.origen}.${p.columna} control con A: ${ok.mensaje}`);
    }
    expect(malas).toEqual([]);
  });
});
