// Escritura y lectura de apoyo del importador de personas (CAR-282): previsión y cuenta bancaria viven
// en tablas propias (una fila por persona) y el motor las ve como campos de la misma persona.
import type { TenantTx } from "@opai/db";

type Prevision = { afp: string | null; regimen: string | null; sistemaSalud: string | null; isapreNombre: string | null };
type Pago = { bancoCodigo: string; tipoCuenta: string; numeroCuenta: string };
type PersonaConDatos = {
  id: string;
  updatedAt: Date;
  prevision: (Prevision & { updatedAt: Date }) | null;
  pago: { bancoCodigo: string | null; tipoCuenta: string | null; numeroCuenta: string | null; updatedAt: Date } | null;
} & Record<string, unknown>;

/** Persona con su previsión y su cuenta como un solo registro plano, con las claves del importador. */
export function aplanar(p: PersonaConDatos): { id: string; updatedAt: Date } & Record<string, unknown> {
  const { prevision, pago, ...persona } = p;
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
  await tx.personaPago.create({ data: { tenantId, personaId, ...datos } });
}

export async function actualesPersonas(tx: TenantTx, ids: readonly string[]) {
  const filas = await tx.persona.findMany({ where: { id: { in: [...ids] } }, include: { prevision: true, pago: true } });
  return filas.map(aplanar);
}

/** Una persona creada por el lote no se borra si ya tiene vínculo, sueldo, anexos o usuario. */
export async function bloqueosPersonas(tx: TenantTx, ids: readonly string[]): Promise<Map<string, string>> {
  const filas = await tx.persona.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, usuarioId: true, _count: { select: { vinculos: true, estructuras: true, anexos: true, pagoSolicitudes: true } } },
  });
  const con = filas.filter((p) => p.usuarioId || Object.values(p._count).some((n) => n > 0));
  return new Map(con.map((p) => [p.id, "ya tiene vínculo laboral, sueldo, anexos, solicitudes de pago o un usuario asociado"]));
}
