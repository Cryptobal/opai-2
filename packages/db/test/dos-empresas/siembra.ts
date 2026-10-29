// Siembra genérica (CAR-48): una fila por tabla con `tenant_id` en cada empresa, generada desde el
// catálogo. Las referencias no nulas apuntan a la fila sembrada de la MISMA empresa (orden topológico);
// las anulables quedan en NULL salvo que un ajuste diga otra cosa. Una tabla nueva entra sola; si su
// CHECK o su trigger rechaza los valores genéricos, la prueba falla y pide un ajuste en `ajustes.ts`.
import { randomUUID } from "node:crypto";
import { Client } from "pg";

import { AJUSTES, type Contexto } from "./ajustes";
import { type Columna, describir, type Tabla, tablasConTenant } from "./catalogo";

export type Fila = Record<string, unknown>;
const GLOBALES = { tenants: "core.tenants", users: "core.users" } as const;
const MEMBRESIAS = "core.memberships";

/** Valor genérico para una columna NOT NULL sin defecto (texto único: nunca choca con un índice). */
function generico(c: Columna): unknown {
  if (c.etiquetas?.length) return c.etiquetas[0];
  if (c.tipo.startsWith("_")) return "{}";
  switch (c.tipo) {
    case "uuid":
      return randomUUID();
    case "int2":
    case "int4":
    case "int8":
    case "numeric":
      return 1;
    case "bool":
      return false;
    case "date":
      return "2026-01-01";
    case "timestamptz":
    case "timestamp":
      return new Date();
    case "json":
    case "jsonb":
      return "{}";
    case "bytea":
      return Buffer.from([0]);
    default:
      return `dos-empresas-${randomUUID()}`;
  }
}

export function valores(t: Tabla, ctx: Contexto): Fila {
  const fila: Fila = {};
  for (const c of t.columnas) {
    if (c.generada) continue;
    if (c.nombre === "tenant_id") fila[c.nombre] = ctx.tenant;
    const ref = t.referencias.find((r) => r.columna === c.nombre);
    if (c.nombre === "tenant_id" || !c.noNula || c.conDefecto) continue;
    if (ref?.tabla === GLOBALES.tenants) fila[c.nombre] = ctx.tenant;
    else if (ref?.tabla === GLOBALES.users) fila[c.nombre] = ctx.usuario;
    else if (ref) fila[c.nombre] = ctx.filas.get(ref.tabla)?.[ref.columnaRef] ?? null;
    else fila[c.nombre] = generico(c);
  }
  return { ...fila, ...(AJUSTES[t.nombre]?.valores(ctx) ?? {}) };
}

export async function insertar(pg: Client, tabla: string, fila: Fila): Promise<Fila> {
  const cols = Object.keys(fila);
  const lista = cols.map((c) => `"${c}"`).join(", ");
  const params = cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = cols.length
    ? `INSERT INTO ${tabla} (${lista}) VALUES (${params}) RETURNING *`
    : `INSERT INTO ${tabla} DEFAULT VALUES RETURNING *`;
  const r = await pg.query<Fila>(sql, Object.values(fila));
  const nueva = r.rows[0];
  if (!nueva) throw new Error(`${tabla}: el INSERT no devolvió la fila`);
  return nueva;
}

/**
 * Dependencias de siembra: referencias no nulas a otras tablas con tenant y las de los ajustes. Una
 * referencia a `core.users` espera la membresía del usuario de prueba en su empresa (desde CAR-46 el
 * trigger `usuario_miembro` exige que el usuario sea miembro).
 */
function dependencias(t: Tabla, conTenant: Set<string>): string[] {
  const noNulas = new Set(t.columnas.filter((c) => c.noNula && !c.conDefecto).map((c) => c.nombre));
  const usadas = t.referencias.filter((r) => noNulas.has(r.columna) && r.tabla !== t.nombre);
  const refs = usadas.filter((r) => conTenant.has(r.tabla)).map((r) => r.tabla);
  const miembro =
    t.nombre !== MEMBRESIAS &&
    conTenant.has(MEMBRESIAS) &&
    usadas.some((r) => r.tabla === GLOBALES.users)
      ? [MEMBRESIAS]
      : [];
  return [...new Set([...refs, ...miembro, ...(AJUSTES[t.nombre]?.dependencias ?? [])])];
}

export type Siembra = {
  tablas: Map<string, Tabla>;
  filas: Record<"a" | "b", Map<string, Fila>>;
  errores: Map<string, string>;
};

/** Siembra A y B tabla por tabla; cada INSERT corre con `app.tenant_id` de su empresa fijado. */
export async function sembrar(pg: Client, tenants: { a: string; b: string }): Promise<Siembra> {
  const nombres = await tablasConTenant(pg);
  const tablas = new Map<string, Tabla>();
  for (const n of nombres) tablas.set(n, await describir(pg, n));
  const conTenant = new Set(nombres);
  const usuarios = await usuariosDePrueba(pg);
  const filas = { a: new Map<string, Fila>(), b: new Map<string, Fila>() };
  const errores = new Map<string, string>();
  const pendientes = new Set(nombres);
  while (pendientes.size) {
    const listas = [...pendientes].filter((n) =>
      dependencias(tablas.get(n) as Tabla, conTenant).every(
        (d) => filas.a.has(d) || errores.has(d),
      ),
    );
    if (!listas.length) {
      for (const n of pendientes) errores.set(n, "ciclo de referencias NOT NULL sin ajuste");
      break;
    }
    for (const n of listas) {
      pendientes.delete(n);
      const t = tablas.get(n) as Tabla;
      const falla = dependencias(t, conTenant).find((d) => errores.has(d));
      if (falla) {
        errores.set(n, `depende de ${falla}, que no se pudo sembrar`);
        continue;
      }
      try {
        for (const lado of ["a", "b"] as const) {
          const ctx = { tenant: tenants[lado], usuario: usuarios[lado], filas: filas[lado] };
          await pg.query("SELECT set_config('app.tenant_id', $1, false)", [ctx.tenant]);
          filas[lado].set(n, await insertar(pg, n, valores(t, ctx)));
        }
      } catch (error) {
        errores.set(n, error instanceof Error ? error.message : String(error));
      }
    }
  }
  await pg.query("SELECT set_config('app.tenant_id', '', false)");
  return { tablas, filas, errores };
}

/**
 * Borra las claves y secretos sembrados: no son cifrados reales, y `rotar-kek` (secretos-db.test.ts)
 * recorre las DEK de todas las empresas de la base compartida. El resto de las filas se queda, como en
 * las demás pruebas de base (varias tablas son append-only).
 */
export async function limpiarClaves(pg: Client, tenants: readonly string[]): Promise<void> {
  await pg.query("DELETE FROM core.secretos WHERE tenant_id = ANY($1::uuid[])", [tenants]);
  await pg.query("DELETE FROM core.claves_tenant WHERE tenant_id = ANY($1::uuid[])", [tenants]);
}

/** Conexión del rol propietario para sembrar (las pruebas de otros paquetes no dependen de `pg`). */
export async function conectar(url: string): Promise<Client> {
  const pg = new Client({ connectionString: url });
  await pg.connect();
  return pg;
}

/** Un usuario global por empresa para las columnas NOT NULL que apuntan a `core.users`. */
async function usuariosDePrueba(pg: Client): Promise<{ a: string; b: string }> {
  const t = await describir(pg, GLOBALES.users);
  const uno = async () => {
    const ctx = { tenant: "", usuario: "", filas: new Map<string, Fila>() };
    const fila = valores(t, ctx);
    if ("email" in fila) fila["email"] = `dos-empresas-${randomUUID()}@opai.test`;
    return String((await insertar(pg, GLOBALES.users, fila))["id"]);
  };
  return { a: await uno(), b: await uno() };
}
