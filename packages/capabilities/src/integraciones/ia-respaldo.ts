// Cadena de respaldo de IA y política BYOK cuando el tenant usa keys propias.
//
// Decisión de Carlos, 26-oct-2026 21:58 CLT, respuesta t214s684, a «Si el tenant tiene key propia y
// su proveedor falla, ¿se puede pasar a la key de OPAI?»: «Nunca, que falle y avise al tenant».
//
// En consecuencia, si el tenant tiene al menos una key propia conectada, el respaldo entre
// proveedores solo usa otras keys del MISMO tenant; nunca cae a la de OPAI (plataforma). Si todas
// fallan, la solicitud falla con `ErrorRespaldoIa` y se avisa al tenant por el mecanismo existente
// (ADR-020): la integración queda en estado "error" (visible en Configuración → Integraciones) y se
// emite `core.integracion.error`, que Comunicaciones entrega. Además deja un registro de auditoría
// durable, que sobrevive aunque la transacción de una capacidad de lectura (p. ej. `core.ia.probar`)
// se revierta al propagarse el error.
import { definicionIntegracion, ErrorIa, type ProveedorIaId } from "@opai/integrations";

import type { Contexto } from "../types";
import type { Credencial } from "./resolver";

export type Candidato = { id: ProveedorIaId; modelo: string; cred: Credencial; baseUrl?: string };
export type FalloProveedor = { proveedor: ProveedorIaId; error: ErrorIa };

/** El respaldo de IA se agotó: todas las keys propias del tenant fallaron y no se usó la de OPAI. */
export class ErrorRespaldoIa extends Error {
  constructor(
    readonly proveedores: readonly ProveedorIaId[],
    readonly causa: ErrorIa | undefined,
  ) {
    super(
      "La IA del tenant no respondió y, por política, no se usó la de OPAI. " +
        "Revisa tus credenciales en Configuración → Integraciones.",
    );
    this.name = "ErrorRespaldoIa";
  }
}

/** Recorre la cadena: salta al siguiente proveedor solo ante un error reintentable (5xx/429/red). */
export async function conRespaldo<T>(
  cands: readonly Candidato[],
  conRetry: boolean,
  fallos: FalloProveedor[],
  intentar: (c: Candidato) => Promise<T>,
): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < cands.length; i++) {
    try {
      return await intentar(cands[i]!);
    } catch (e) {
      if (e instanceof ErrorIa) fallos.push({ proveedor: cands[i]!.id, error: e });
      const sePuede = conRetry && i < cands.length - 1 && e instanceof ErrorIa && e.reintentable;
      if (!sePuede) throw e;
      ultimo = e;
    }
  }
  throw (ultimo as Error | undefined) ?? new Error("Sin proveedores de IA.");
}

/**
 * Al agotar la cadena de keys propias por un fallo del proveedor (reintentable: 5xx/429/red), avisa
 * al tenant y devuelve el error tipado. Un 4xx de contenido se propaga tal cual (no es caída de la
 * key ni habría respaldo), igual que sin la política.
 */
export async function finDeCadena(
  ctx: Contexto,
  avisar: boolean,
  fallos: readonly FalloProveedor[],
  e: unknown,
): Promise<unknown> {
  if (!avisar || !(e instanceof ErrorIa && e.reintentable)) return e;
  await avisarTenantIaFallo(ctx, fallos);
  return new ErrorRespaldoIa(
    fallos.map((f) => f.proveedor),
    e,
  );
}

const recorte = (mensaje: string) => mensaje.slice(0, 300);

/** Avisa al tenant que su IA propia falló. Best-effort: nunca enmascara el error original. */
export async function avisarTenantIaFallo(
  ctx: Contexto,
  fallos: readonly FalloProveedor[],
): Promise<void> {
  if (fallos.length === 0) return;
  // Registro durable e independiente de la transacción de la solicitud (forTenant propio).
  for (const f of fallos)
    await ctx.auditoria
      .registrar({
        tenantId: ctx.tenantId,
        capability: "core.ia.respaldo_agotado",
        actor: ctx.actor,
        entityType: "integracion",
        entityId: f.proveedor,
        payload: { proveedor: f.proveedor, error: recorte(f.error.message) },
      })
      .catch(() => undefined);
  // Aviso visible en el tenant (ADR-020): estado "error" + evento que consume Comunicaciones.
  await ctx
    .transaccion(async (tx) => {
      for (const f of fallos) {
        const datos = { estado: "error", ultimoTestEn: new Date(), ultimoError: recorte(f.error.message) };
        const previo = await tx.integracion.findUnique({
          where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: f.proveedor } },
        });
        await tx.integracion.upsert({
          where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: f.proveedor } },
          create: { tenantId: ctx.tenantId, proveedor: f.proveedor, modalidad: "propia", ...datos },
          update: datos,
        });
        // Solo al entrar en error (no en cada reintento) para no inundar las notificaciones. El
        // read+write va en la misma transacción del tenant; dos fallos concurrentes podrían emitir
        // dos avisos (benigno y best-effort), nunca cruzar tenants.
        if (previo?.estado !== "error")
          await ctx.eventos.emitir(tx, {
            tipo: "core.integracion.error",
            entidadTipo: "integracion",
            entidadId: f.proveedor,
            payload: {
              nombre: definicionIntegracion(f.proveedor)?.nombre ?? f.proveedor,
              error: recorte(f.error.message),
            },
          });
      }
    })
    .then(() => ctx.despacharEventos())
    .catch(() => undefined);
}
