// Piezas que comparten los importadores: ids externos, referencia a la cuenta dueña y comparación de textos.
import type { CampoImportable, FilaNormalizada, ValorImportado } from "@opai/domain/importacion";

import type { Contexto } from "../../types";

/** Texto comparable: sin tildes, en minúscula y con espacios simples. */
export const norm = (t: string | null | undefined): string =>
  (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const texto = (v: ValorImportado | undefined): string | null => (typeof v === "string" && v !== "" ? v : null);
export const entero = (v: ValorImportado | undefined): number | null => (typeof v === "number" ? Math.trunc(v) : null);
export const fecha = (v: ValorImportado | undefined): Date | null =>
  typeof v === "string" && v ? new Date(`${v}T00:00:00.000Z`) : null;

export const CAMPO_ID_EXTERNO: CampoImportable = {
  clave: "id_externo",
  etiqueta: "Id en el sistema de origen",
  tipo: "texto",
  sinonimos: ["id", "codigo", "código", "id externo", "external id"],
  ejemplo: "",
  ayuda: "Opcional. Si la planilla trae el id del sistema anterior, reimportar reconoce el mismo registro aunque cambie su nombre.",
  largoMaximo: 120,
};

/** Columnas con que una fila dice a qué cuenta pertenece (basta una; se prueban en este orden). */
export const CAMPOS_CUENTA: readonly CampoImportable[] = [
  { clave: "cuenta_rut", etiqueta: "RUT de la cuenta", tipo: "rut", sinonimos: ["rut cliente", "rut empresa", "rut cuenta", "account rut"], ejemplo: "76.543.210-3" },
  { clave: "cuenta_nombre", etiqueta: "Nombre de la cuenta", tipo: "texto", sinonimos: ["cliente", "cuenta", "empresa", "account", "account name", "accountName"], ejemplo: "Acme SpA" },
  { clave: "cuenta_id_externo", etiqueta: "Id de la cuenta en el sistema de origen", tipo: "texto", sinonimos: ["accountId", "id cuenta", "id cliente"], ejemplo: "", largoMaximo: 120 },
];

/** Ids externos ya registrados de una entidad: id del origen → id en OPAI. */
export async function idsExternos(ctx: Contexto, entidad: string, sistema: string, ids: readonly string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return new Map();
  const filas = await ctx.db.idExterno.findMany({
    where: { sistema, entidadTipo: entidad, idExterno: { in: unicos } },
    select: { idExterno: true, entidadId: true },
  });
  return new Map(filas.map((f) => [f.idExterno, f.entidadId]));
}

export type CuentaRef = { id: string; nombre: string };
export type ResultadoCuenta = { cuenta: CuentaRef } | { error: string };

/**
 * Resuelve la cuenta de cada fila en tres consultas (no una por fila): por id externo, por RUT y por
 * nombre exacto sin distinguir mayúsculas ni tildes. Un nombre que calza con varias cuentas no se adivina.
 */
export async function resolverCuentas(ctx: Contexto, filas: readonly FilaNormalizada[], sistema: string) {
  const ruts = [...new Set(filas.map((f) => texto(f.datos["cuenta_rut"])).filter((r): r is string => !!r))];
  const porExterno = await idsExternos(ctx, "cuenta", sistema, filas.map((f) => texto(f.datos["cuenta_id_externo"]) ?? ""));
  const cuentas = await ctx.db.cuenta.findMany({ where: { archivadaEn: null }, select: { id: true, nombre: true, rut: true } });
  const porId = new Map(cuentas.map((c) => [c.id, c]));
  const porRut = new Map(cuentas.filter((c) => c.rut && ruts.includes(c.rut)).map((c) => [c.rut ?? "", c]));
  const porNombre = new Map<string, CuentaRef[]>();
  for (const c of cuentas) porNombre.set(norm(c.nombre), [...(porNombre.get(norm(c.nombre)) ?? []), c]);
  return (f: FilaNormalizada): ResultadoCuenta => {
    const ext = texto(f.datos["cuenta_id_externo"]);
    const rut = texto(f.datos["cuenta_rut"]);
    const nombre = texto(f.datos["cuenta_nombre"]);
    const porExt = ext ? porId.get(porExterno.get(ext) ?? "") : undefined;
    if (porExt) return { cuenta: porExt };
    const deRut = rut ? porRut.get(rut) : undefined;
    if (deRut) return { cuenta: deRut };
    const candidatas = nombre ? (porNombre.get(norm(nombre)) ?? []) : [];
    if (candidatas.length === 1 && candidatas[0]) return { cuenta: candidatas[0] };
    if (candidatas.length > 1) return { error: `Hay ${candidatas.length} cuentas llamadas «${nombre}»: indica el RUT de la cuenta.` };
    if (!ext && !rut && !nombre) return { error: "Falta la cuenta: indica su RUT, su nombre o su id de origen." };
    return { error: "La cuenta no existe en OPAI. Importa primero las cuentas." };
  };
}
