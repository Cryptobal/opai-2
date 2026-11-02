import { cifrar, descifrar, generarDek, kekDelEntorno, sufijoDe } from "@opai/integrations";

import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

const bytes = (b: Uint8Array) => Uint8Array.from(b);

/** KEK de plataforma o error claro (sin la variable no se guardan secretos en este entorno). */
function kek(): { clave: Buffer; version: number; anterior: Buffer | null } {
  const k = kekDelEntorno();
  if (!k.actual)
    throw reglaDeNegocio("El almacén de secretos no está configurado (OPAI_SECRETS_KEY).");
  return { clave: k.actual, version: k.version, anterior: k.anterior };
}

/** DEK del tenant: la crea la primera vez, cifrada con la KEK vigente (envelope, ADR-027). */
export async function dekDe(ctx: Contexto): Promise<Buffer> {
  const { clave, version, anterior } = kek();
  const fila = await ctx.db.claveTenant.findUnique({ where: { tenantId: ctx.tenantId } });
  if (fila) {
    // Durante una rotación (scripts/rotar-kek.ts) una DEK aún puede estar con la KEK anterior.
    const conAnterior = fila.kekVersion < version && anterior;
    return descifrar(conAnterior ? anterior : clave, {
      cifrado: fila.dekCifrada,
      iv: fila.iv,
      tag: fila.tag,
    });
  }
  const dek = generarDek();
  const c = cifrar(clave, dek);
  await ctx.db.claveTenant.create({
    data: {
      tenantId: ctx.tenantId,
      dekCifrada: bytes(c.cifrado),
      iv: bytes(c.iv),
      tag: bytes(c.tag),
      kekVersion: version,
    },
  });
  return dek;
}

export async function guardarSecreto(
  ctx: Contexto,
  integracionId: string,
  nombre: string,
  valor: string,
): Promise<{ sufijo: string }> {
  const r = await guardarSecretoConId(ctx, integracionId, nombre, valor);
  return { sufijo: r.sufijo };
}

/** Guarda un secreto cifrado dentro de una transacción ya abierta (sin anidar otra). */
export async function guardarSecretoConIdTx(
  tx: TenantTx,
  ctx: Contexto,
  integracionId: string,
  nombre: string,
  valor: string,
): Promise<{ id: string; sufijo: string }> {
  await tx.$queryRaw`/* 07d:bloqueo-dek */ SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR SHARE`;
  const c = cifrar(await dekDe({ ...ctx, db: tx }), Buffer.from(valor, "utf8"));
  const row = await guardarCifrado(tx, ctx, integracionId, nombre, valor, c);
  return { id: row.id, sufijo: sufijoDe(valor) };
}

/** Inserta un secreto cifrado; falla si el nombre ya existe (nunca sobrescribe). */
export async function insertarSecretoConIdTx(
  tx: TenantTx,
  ctx: Contexto,
  integracionId: string,
  nombre: string,
  valor: string,
): Promise<{ id: string; sufijo: string }> {
  await tx.$queryRaw`/* 07d:bloqueo-dek */ SELECT id FROM core.claves_tenant WHERE tenant_id = ${ctx.tenantId}::uuid FOR SHARE`;
  const previo = await tx.secreto.findUnique({
    where: { tenantId_integracionId_nombre: { tenantId: ctx.tenantId, integracionId, nombre } },
    select: { id: true },
  });
  if (previo) {
    throw reglaDeNegocio("Ya existe un secreto registrado para este rango de folios.");
  }
  const c = cifrar(await dekDe({ ...ctx, db: tx }), Buffer.from(valor, "utf8"));
  const datos = {
    cifrado: bytes(c.cifrado),
    iv: bytes(c.iv),
    tag: bytes(c.tag),
    sufijo: sufijoDe(valor),
  };
  const row = await tx.secreto.create({
    data: {
      tenantId: ctx.tenantId,
      integracionId,
      nombre,
      ...datos,
      creadoPor: ctx.usuario?.id ?? null,
    },
  });
  return { id: row.id, sufijo: sufijoDe(valor) };
}

/** Guarda un secreto cifrado y devuelve su id (p. ej. CAF en finanzas.dte_folios). */
export async function guardarSecretoConId(
  ctx: Contexto,
  integracionId: string,
  nombre: string,
  valor: string,
): Promise<{ id: string; sufijo: string }> {
  let out = { id: "", sufijo: "" };
  await ctx.transaccion(async (tx) => {
    out = await guardarSecretoConIdTx(tx, ctx, integracionId, nombre, valor);
  });
  return out;
}

async function guardarCifrado(
  db: TenantTx,
  ctx: Contexto,
  integracionId: string,
  nombre: string,
  valor: string,
  c: ReturnType<typeof cifrar>,
): Promise<{ id: string }> {
  const datos = {
    cifrado: bytes(c.cifrado),
    iv: bytes(c.iv),
    tag: bytes(c.tag),
    sufijo: sufijoDe(valor),
  };
  const row = await db.secreto.upsert({
    where: { tenantId_integracionId_nombre: { tenantId: ctx.tenantId, integracionId, nombre } },
    create: {
      tenantId: ctx.tenantId,
      integracionId,
      nombre,
      ...datos,
      creadoPor: ctx.usuario?.id ?? null,
    },
    update: datos,
  });
  return { id: row.id };
}

/** Solo para adaptadores del servidor. Nunca se devuelve por capacidad, API ni MCP. */
export async function leerSecreto(ctx: Contexto, integracionId: string, nombre: string) {
  const s = await ctx.db.secreto.findUnique({
    where: { tenantId_integracionId_nombre: { tenantId: ctx.tenantId, integracionId, nombre } },
  });
  if (!s) return null;
  return descifrar(await dekDe(ctx), { cifrado: s.cifrado, iv: s.iv, tag: s.tag }).toString("utf8");
}
