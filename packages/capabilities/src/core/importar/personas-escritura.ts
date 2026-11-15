// Escritura y lectura de apoyo del importador de personas (CAR-282): previsión y cuenta bancaria viven
// en tablas propias (una fila por persona) y el motor las ve como campos de la misma persona.
import type { TenantTx } from "@opai/db";
import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";

type Prevision = { afp: string | null; regimen: string | null; sistemaSalud: string | null; isapreNombre: string | null };
type Pago = { bancoCodigo: string; tipoCuenta: string; numeroCuenta: string };
type PersonaConDatos = {
  id: string;
  updatedAt: Date;
  prevision: (Prevision & { updatedAt: Date }) | null;
  pagos: { bancoCodigo: string | null; tipoCuenta: string | null; numeroCuenta: string | null; updatedAt: Date }[];
} & Record<string, unknown>;

/** Persona con su previsión y su cuenta como un solo registro plano, con las claves del importador. */
export function aplanar(p: PersonaConDatos): { id: string; updatedAt: Date } & Record<string, unknown> {
  const { prevision, pagos, ...persona } = p;
  const pago = pagos[0];
  const fechas = [p.updatedAt, prevision?.updatedAt, pago?.updatedAt].filter((f): f is Date => !!f);
  return {
    ...persona,
    afp: prevision?.afp ?? null,
    regimen: prevision?.regimen ?? null,
    sistemaSalud: prevision?.sistemaSalud ?? null,
    isapreNombre: prevision?.isapreNombre ?? null,
    bancoCodigo: pago?.bancoCodigo ?? null,
    tipoCuenta: pago?.tipoCuenta ?? null,
    // Cifrado tal como está guardado: solo sirve para saber si hay cuenta, nunca sale por la capacidad.
    numeroCuenta: pago?.numeroCuenta ?? null,
    updatedAt: new Date(Math.max(...fechas.map((f) => f.getTime()))),
  };
}

export async function guardarPrevision(tx: TenantTx, tenantId: string, personaId: string, datos: Partial<Prevision>) {
  await tx.personaPrevision.upsert({
    where: { personaId },
    create: { tenantId, personaId, ...datos },
    update: datos,
  });
}

/** `numeroCuenta` llega ya cifrado. Solo crea: la importación nunca reemplaza una cuenta existente. */
export async function guardarPago(tx: TenantTx, tenantId: string, personaId: string, datos: Pago) {
  await tx.personaPago.create({ data: { tenantId, personaId, ...datos, porDefecto: true } });
}

export async function actualesPersonas(tx: TenantTx, ids: readonly string[]) {
  const filas = await tx.persona.findMany({ where: { id: { in: [...ids] } }, include: { prevision: true, pagos: { where: { porDefecto: true } } } });
  return filas.map(aplanar);
}

/**
 * Una persona creada por el lote no se borra si ya tiene datos que la importación no cargó (vínculo,
 * sueldo, anexos, usuario, tallas, jornada, OS-10, contacto de emergencia): se perderían en cascada.
 * Tampoco si tiene previsión o cuenta bancaria y quien revierte no puede gestionar esa sección.
 */
export async function bloqueosPersonas(tx: TenantTx, ids: readonly string[], ctx: Contexto): Promise<Map<string, string>> {
  const filas = await tx.persona.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      usuarioId: true,
      prevision: { select: { id: true } },
      pagos: { select: { id: true } },
      uniforme: { select: { id: true } },
      jornadaDt: { select: { id: true } },
      os10: { select: { id: true } },
      contactoLaboral: { select: { id: true } },
      _count: { select: { vinculos: true, estructuras: true, anexos: true, pagoSolicitudes: true, uniformeEntregas: true } },
    },
  });
  const puedePrevision = ctx.autorizar(PERMISOS_CORE.personasPrevisionManage);
  const puedePago = ctx.autorizar(PERMISOS_CORE.personasPagoManage);
  const bloqueos = new Map<string, string>();
  for (const p of filas) {
    const conDatos = p.usuarioId || p.uniforme || p.jornadaDt || p.os10 || p.contactoLaboral || Object.values(p._count).some((n) => n > 0);
    if (conDatos) bloqueos.set(p.id, "ya tiene vínculo, sueldo, anexos, tallas, jornada, OS-10, contacto de emergencia, solicitudes de pago o un usuario");
    else if (p.prevision && !puedePrevision) bloqueos.set(p.id, "tiene previsión y no tienes permiso para gestionarla");
    else if (p.pagos.length > 0 && !puedePago) bloqueos.set(p.id, "tiene cuenta bancaria y no tienes permiso para gestionarla");
  }
  return bloqueos;
}
