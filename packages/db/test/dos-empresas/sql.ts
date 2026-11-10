// Ayudas SQL de la prueba de dos empresas (CAR-48): ejecutar como `opai_app` con un tenant fijado,
// capturar el código de error de Postgres y copiar una fila sembrada sin chocar con sus únicos.
import { randomUUID } from "node:crypto";
import { type Client } from "pg";

import { type Tabla } from "./catalogo";
import { AJUSTES } from "./ajustes";
import { type Fila } from "./siembra";

export type Resultado = { filas: number; codigo?: string; mensaje?: string };

/** Corre `sql` en una transacción con `app.tenant_id` fijado y la revierte siempre. */
export async function comoTenant(
  pg: Client,
  tenant: string,
  sql: string,
  params: unknown[] = [],
  /** Fija `app.user_id` (tablas con política restrictiva por usuario, p. ej. `core.novedades_lectura`). */
  usuarioId?: string,
): Promise<Resultado> {
  await pg.query("BEGIN");
  try {
    await pg.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    if (usuarioId) await pg.query("SELECT set_config('app.user_id', $1, true)", [usuarioId]);
    const r = await pg.query(sql, params);
    return { filas: r.rowCount ?? 0 };
  } catch (error) {
    const e = error as { code?: string; message?: string };
    return { filas: 0, codigo: e.code ?? "?", mensaje: e.message ?? "" };
  } finally {
    await pg.query("ROLLBACK");
  }
}

export async function privilegio(pg: Client, rol: string, tabla: string, accion: string) {
  const r = await pg.query<{ ok: boolean }>("SELECT has_table_privilege($1, $2, $3) AS ok", [
    rol,
    tabla,
    accion,
  ]);
  return r.rows[0]?.ok === true;
}

/** Columnas que `rol` puede actualizar (privilegio de tabla o de columna). */
export async function columnasActualizables(pg: Client, rol: string, t: Tabla): Promise<string[]> {
  const fuera = new Set(t.columnas.filter((c) => c.generada).map((c) => c.nombre));
  const r = await pg.query<{ col: string }>(
    `SELECT a.attname AS col FROM pg_attribute a
     WHERE a.attrelid = $2::regclass AND a.attnum > 0 AND NOT a.attisdropped
       AND has_column_privilege($1, a.attrelid, a.attnum, 'UPDATE')`,
    [rol, t.nombre],
  );
  return r.rows.map((f) => f.col).filter((c) => !fuera.has(c));
}

/**
 * Copia de una fila sembrada para un INSERT nuevo: conserva tenant y referencias, cambia las columnas
 * de índices únicos y omite las generadas (`id` cambia siempre: es único).
 */
export function copia(t: Tabla, fila: Fila, cambios: Fila = {}): Fila {
  const refs = new Set(t.referencias.map((r) => r.columna));
  const omitir = new Set(AJUSTES[t.nombre]?.omitir ?? []);
  const nueva: Fila = {};
  for (const c of t.columnas) {
    if (c.generada || omitir.has(c.nombre) || !(c.nombre in fila)) continue;
    const valor = fila[c.nombre];
    const regenerar =
      t.unicas.has(c.nombre) &&
      c.nombre !== "tenant_id" &&
      !refs.has(c.nombre) &&
      !(AJUSTES[t.nombre]?.fijas ?? []).includes(c.nombre);
    if (c.tipo === "json" || c.tipo === "jsonb")
      nueva[c.nombre] = valor === null ? null : JSON.stringify(valor);
    else if (!regenerar || valor === null) nueva[c.nombre] = valor;
    else if (c.tipo === "uuid") nueva[c.nombre] = randomUUID();
    else if (typeof valor === "number" || /^int|numeric/.test(c.tipo))
      nueva[c.nombre] = 2 + Math.floor(Math.random() * 1_000_000);
    else if (typeof valor === "string") nueva[c.nombre] = `dos-empresas-${randomUUID()}`;
    else if (!c.conDefecto) nueva[c.nombre] = valor;
  }
  return { ...nueva, ...cambios };
}

export function sqlInsert(tabla: string, fila: Fila): { sql: string; params: unknown[] } {
  const cols = Object.keys(fila);
  return {
    sql: `INSERT INTO ${tabla} (${cols.map((c) => `"${c}"`).join(", ")})
          VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    params: Object.values(fila),
  };
}
