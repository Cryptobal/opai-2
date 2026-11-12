import { PERMISOS_CORE } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import type { Contexto } from "../../types";
import { listarAjustes } from "./catalogo";
import { AJUSTES_OCULTOS_A_EMPRESAS } from "./integraciones-habilitadas";
import { type CampoAjuste, valorPorDefecto } from "./registro";

export type Origen = "defecto" | "plataforma" | "tenant" | "usuario";
export type ValorEfectivo = { valor: unknown; origen: Origen; version?: number };

const k = (modulo: string, clave: string) => `${modulo}.${clave}`;

/** Campos que el actor puede ver: todos con core:config.read; si no, solo los de su usuario. */
export function camposVisibles(ctx: Contexto, modulo?: string): CampoAjuste[] {
  const todos = listarAjustes().filter(
    (c) => (!modulo || c.modulo === modulo) && !AJUSTES_OCULTOS_A_EMPRESAS.has(k(c.modulo, c.clave)),
  );
  return ctx.autorizar(PERMISOS_CORE.configRead)
    ? todos
    : todos.filter((c) => c.meta.ambito === "usuario");
}

/**
 * Valor efectivo de cada campo: defecto del esquema → plataforma → tenant → usuario, según el
 * ámbito del campo. Un valor guardado que ya no valida (esquema cambiado) se ignora.
 */
export async function valoresEfectivos(
  ctx: Contexto,
  campos: CampoAjuste[],
  db: TenantTx = ctx.db,
) {
  const modulos = [...new Set(campos.map((c) => c.modulo))];
  const usuarioId = ctx.usuario?.id ?? null;
  const [plataforma, guardados] = await Promise.all([
    db.ajustePlataforma.findMany({ where: { modulo: { in: modulos } } }),
    db.ajuste.findMany({
      where: {
        modulo: { in: modulos },
        OR: [
          { ambito: "tenant", sujetoId: ctx.tenantId },
          ...(usuarioId ? [{ ambito: "usuario", sujetoId: usuarioId }] : []),
        ],
      },
    }),
  ]);
  const por = (ambito: string) =>
    new Map(
      guardados.filter((g) => g.ambito === ambito).map((g) => [k(g.modulo, g.clave), g.valor]),
    );
  const capas: [Origen, Map<string, unknown>][] = [
    ["plataforma", new Map(plataforma.map((p) => [k(p.modulo, p.clave), p.valor]))],
    ["tenant", por("tenant")],
    ["usuario", por("usuario")],
  ];
  const resultado = new Map<string, ValorEfectivo>();
  for (const c of campos) {
    let actual: ValorEfectivo = { valor: valorPorDefecto(c), origen: "defecto" };
    const permitidas = c.meta.ambito === "plataforma" ? 1 : c.meta.ambito === "tenant" ? 2 : 3;
    for (const [origen, mapa] of capas.slice(0, permitidas)) {
      if (!mapa.has(k(c.modulo, c.clave))) continue;
      const r = c.schema.safeParse(mapa.get(k(c.modulo, c.clave)));
      if (r.success) actual = { valor: r.data, origen };
    }
    if (c.meta.ambito === "usuario" && c.clave.startsWith("navegacion_"))
      actual.version =
        guardados.find(
          (g) =>
            g.ambito === "usuario" &&
            g.sujetoId === usuarioId &&
            g.modulo === c.modulo &&
            g.clave === c.clave,
        )?.version ?? 0;
    resultado.set(k(c.modulo, c.clave), actual);
  }
  return resultado;
}

/**
 * Atajo para leer un ajuste efectivo desde otra capacidad (p. ej. tamaño máximo de documentos).
 * `db` permite leer dentro de una transacción (`ctx.transaccion`) para que la lectura del ajuste y
 * la escritura que depende de él sean atómicas; por defecto usa `ctx.db`.
 */
export async function ajuste<T>(
  ctx: Contexto,
  modulo: string,
  clave: string,
  db: TenantTx = ctx.db,
): Promise<T> {
  const campo = listarAjustes().find((c) => c.modulo === modulo && c.clave === clave);
  if (!campo) throw new Error(`Ajuste no declarado: ${modulo}.${clave}`);
  return (await valoresEfectivos(ctx, [campo], db)).get(k(modulo, clave))?.valor as T;
}
