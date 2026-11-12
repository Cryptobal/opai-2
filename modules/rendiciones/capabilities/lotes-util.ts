import type { Contexto } from "@opai/capabilities";
import { cifradoDeCampos, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { tienePermisoEfectivo, esRol } from "@opai/domain";

import { codigoLote, type EstadoLote } from "../domain";
import { PERMISO_APROBAR_LOTE } from "./permisos";

type Tx = Contexto["db"];

/** Siguiente código LP-n de la empresa; el UPDATE bloquea la fila, así que no hay códigos repetidos. */
export async function siguienteCodigoLote(tx: Tx, tenantId: string): Promise<number> {
  await tx.lotePagoContador.createMany({ data: [{ tenantId }], skipDuplicates: true });
  return (await tx.lotePagoContador.update({ where: { tenantId }, data: { ultimo: { increment: 1 } } })).ultimo;
}

export async function loteDe(ctx: Contexto, id: string) {
  const l = await ctx.db.lotePago.findFirst({ where: { id }, include: { items: { where: {} } } });
  if (!l) throw noEncontrado("El lote de pago");
  return l;
}

/** Anota un paso en la línea de tiempo del lote y emite el evento, en la transacción de la escritura. */
export async function anotarPasoLote(
  ctx: Contexto,
  tx: Tx,
  l: { id: string; tenantId: string },
  paso: { tipo: string; actorId: string; desde?: string | null; hasta?: string | null; comentario?: string | null | undefined },
  payload: Record<string, unknown> = {},
): Promise<void> {
  await tx.lotePagoHistorial.create({
    data: { tenantId: l.tenantId, loteId: l.id, tipo: paso.tipo, actorId: paso.actorId, estadoDesde: paso.desde ?? null, estadoHasta: paso.hasta ?? null, comentario: paso.comentario ?? null },
  });
  await ctx.eventos.emitir(tx, { tipo: `rendiciones.lote.${paso.tipo}`, entidadTipo: "lote_pago", entidadId: l.id, payload });
}

/** Personas activas de la empresa con el permiso de aprobar lotes (para la regla de «una sola persona»). */
export async function aprobadoresDeLote(ctx: Contexto): Promise<string[]> {
  const ms = await ctx.db.membership.findMany({
    where: { tenantId: ctx.tenantId, estado: "activa" },
    include: { rolTenant: true, excepciones: true },
  });
  return ms
    .filter((m) =>
      tienePermisoEfectivo(
        {
          rol: m.rolTenant || !esRol(m.rol) ? null : m.rol,
          permisosRol: m.rolTenant ? (m.rolTenant.archivadoEn ? [] : m.rolTenant.permisos) : null,
          excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
        },
        PERMISO_APROBAR_LOTE,
      ),
    )
    .map((m) => m.userId);
}

export type CuentaPersona = { personaId: string; nombre: string; rut: string; correo: string | null; bancoCodigo: string; tipoCuenta: string | null; version: Date };

/**
 * Persona (ficha) de cada usuario que rindió, con su cuenta vigente. Sin descifrar el número: solo dice
 * si hay datos bancarios completos (banco, número y RUT del titular). Alcance: la ficha de la misma empresa.
 */
export async function cuentasDeSolicitantes(ctx: Contexto, userIds: readonly string[]): Promise<Map<string, CuentaPersona>> {
  if (userIds.length === 0) return new Map();
  const personas = await ctx.db.persona.findMany({
    where: { usuarioId: { in: [...userIds] } },
    select: { id: true, usuarioId: true, nombres: true, apellidos: true, emailPersonal: true, pagos: { where: { porDefecto: true }, select: { bancoCodigo: true, tipoCuenta: true, numeroCuenta: true, rutTitular: true, updatedAt: true } } },
  });
  const salida = new Map<string, CuentaPersona>();
  for (const p of personas) {
    const c = p.pagos[0];
    if (!p.usuarioId || !c?.bancoCodigo || !c.numeroCuenta || !c.rutTitular) continue;
    salida.set(p.usuarioId, {
      personaId: p.id, nombre: `${p.nombres} ${p.apellidos}`.trim(), rut: c.rutTitular, correo: p.emailPersonal ?? null,
      bancoCodigo: c.bancoCodigo, tipoCuenta: c.tipoCuenta, version: c.updatedAt,
    });
  }
  return salida;
}

/** Número de cuenta en claro: solo para armar la nómina; nunca se guarda, se registra ni sale por MCP. */
export async function numeroDeCuenta(ctx: Contexto, personaId: string): Promise<string> {
  const c = await ctx.db.personaPago.findFirst({ where: { personaId, porDefecto: true }, select: { numeroCuenta: true } });
  if (!c?.numeroCuenta) throw reglaDeNegocio("Una persona del lote ya no tiene cuenta en su ficha.");
  return cifradoDeCampos(ctx).descifrar("personas_pago", "numero_cuenta", c.numeroCuenta);
}

export const ETIQUETA_LOTE: Record<EstadoLote, string> = { borrador: "Borrador", aprobado: "Aprobado", generado: "Generado", pagado: "Pagado", anulado: "Anulado" };
export { codigoLote, prohibido };
