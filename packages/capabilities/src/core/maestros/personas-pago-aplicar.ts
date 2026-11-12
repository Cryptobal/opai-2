import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import {
  cifrarCampoEnTransaccion,
  descifrarCampoEnTransaccion,
} from "../cumplimiento/cifrado-campos";
import type { Contexto } from "../../types";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];

export interface SolicitudPago {
  tipo: string;
  cuentaId: string | null;
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  rutTitular: string | null;
  titularNombre: string | null;
  porDefecto: boolean;
}

async function numeroVigente(ctx: Contexto, tx: Tx, guardado: string | null) {
  if (!guardado) return null;
  const claro = await descifrarCampoEnTransaccion(
    ctx,
    tx,
    "personas_pago_solicitudes",
    "numero_cuenta",
    guardado,
  );
  return cifrarCampoEnTransaccion(ctx, tx, "personas_pago", "numero_cuenta", claro);
}

async function cuentaDe(tx: Tx, personaId: string, id: string | null) {
  if (!id) throw reglaDeNegocio("La solicitud no indica la cuenta.");
  const c = await tx.personaPago.findFirst({ where: { id, personaId } });
  if (!c) throw noEncontrado("La cuenta bancaria");
  return c;
}

/** CAR-275: aplica una solicitud aprobada; solo hay una cuenta por defecto por persona. */
export async function aplicarSolicitudPago(
  ctx: Contexto,
  tx: Tx,
  persona: { id: string; tenantId: string },
  s: SolicitudPago,
) {
  const personaId = persona.id;
  if (s.tipo === "marcar_defecto") {
    const c = await cuentaDe(tx, personaId, s.cuentaId);
    await tx.personaPago.updateMany({ where: { personaId, porDefecto: true }, data: { porDefecto: false } });
    await tx.personaPago.update({ where: { id: c.id }, data: { porDefecto: true } });
    return;
  }
  if (s.tipo === "quitar") {
    const c = await cuentaDe(tx, personaId, s.cuentaId);
    if (c.porDefecto) throw conflicto("No se puede quitar la cuenta por defecto: marca otra antes.");
    await tx.personaPago.delete({ where: { id: c.id } });
    return;
  }
  const datos = {
    bancoCodigo: s.bancoCodigo,
    tipoCuenta: s.tipoCuenta,
    numeroCuenta: await numeroVigente(ctx, tx, s.numeroCuenta),
    rutTitular: s.rutTitular,
    titularNombre: s.titularNombre,
  };
  const defecto = await tx.personaPago.findFirst({ where: { personaId, porDefecto: true } });
  if (s.tipo === "reemplazar" && defecto) {
    await tx.personaPago.update({ where: { id: defecto.id }, data: datos });
    return;
  }
  const seraDefecto = s.tipo === "reemplazar" || s.porDefecto || !defecto;
  if (seraDefecto) {
    await tx.personaPago.updateMany({ where: { personaId, porDefecto: true }, data: { porDefecto: false } });
  }
  await tx.personaPago.create({
    data: { tenantId: persona.tenantId, personaId, ...datos, porDefecto: seraDefecto },
  });
}
