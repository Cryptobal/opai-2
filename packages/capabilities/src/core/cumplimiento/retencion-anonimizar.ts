import type { TenantTx } from "@opai/db";

// Anonimización de identidad (Ley 21.719, Brief 07d §4.5). Quita lo que identifica al titular y deja
// íntegros los hechos que dependen de su id (vínculos, remuneración, bitácora; ADR-023). Toda
// escritura es condicional (`anonimizadaEn: null` + el predicado de elegibilidad en la misma
// sentencia), así que repetirla no hace nada y no hay TOCTOU entre elegir y escribir.

export const MARCA_ANONIMO = "[anonimizado]";

/**
 * Toma el bloqueo de la fila antes del UPDATE condicional: las escrituras de maestros toman el mismo
 * (`bloquearNoAnonimizado`), así que un vínculo o un cambio concurrente queda confirmado antes de que
 * este UPDATE evalúe su predicado con una instantánea nueva, o ve la marca y falla (§21).
 */
async function bloquear(tx: TenantTx, tabla: "personas" | "contactos", id: string) {
  if (tabla === "personas")
    await tx.$queryRaw`/* 07d:bloqueo-anonimizar */ SELECT id FROM core.personas WHERE id = ${id}::uuid FOR UPDATE`;
  else
    await tx.$queryRaw`/* 07d:bloqueo-anonimizar */ SELECT id FROM core.contactos WHERE id = ${id}::uuid FOR UPDATE`;
}

/** Todos los vínculos terminados antes del corte; sin corte, que no tenga ninguno (§10). */
export const sinRelacionViva = (corte: Date | null) =>
  corte
    ? {
        vinculos: {
          none: { OR: [{ estado: "vigente" }, { termino: null }, { termino: { gte: corte } }] },
        },
      }
    : { vinculos: { none: {} } };

/** Anonimiza la persona si sigue elegible. Devuelve si cambió algo. */
export async function anonimizarPersona(
  tx: TenantTx,
  id: string,
  ahora: Date,
  corte: Date | null,
): Promise<boolean> {
  await bloquear(tx, "personas", id);
  const { count } = await tx.persona.updateMany({
    where: { id, anonimizadaEn: null, ...sinRelacionViva(corte) },
    data: {
      nombres: MARCA_ANONIMO,
      apellidos: "",
      rut: `ANON-${id}`,
      emailPersonal: null,
      emailLaboral: null,
      telefono: null,
      fechaNacimiento: null,
      sexo: null,
      calle: null,
      comuna: null,
      region: null,
      direccionFormateada: null,
      placeId: null,
      lat: null,
      lng: null,
      usuarioId: null,
      bloqueoMotivo: null,
      // Marca P1 "No recontratar": al anonimizar al titular no queda ni la marca ni su motivo
      // (corrección del Revisor, 30-oct 15:33 CLT). El motivo nunca llegó en claro a `audit_events`
      // (la capacidad lo marca `sensibles`), así que no hace falta tocar la auditoría.
      noRecontratar: false,
      noRecontratarMotivo: null,
      noRecontratarEn: null,
      noRecontratarVenceEn: null,
      estado: "inactiva",
      anonimizadaEn: ahora,
    },
  });
  if (count !== 1) return false;
  // Los ids de otros sistemas llevan de vuelta a la identidad: se sueltan.
  await tx.idExterno.deleteMany({ where: { entidadTipo: "persona", entidadId: id } });
  // Un rostro enrolado es un dato biométrico: se borra también (aquí y en el proveedor, que no se llama
  // dentro de esta transacción). El consumidor de la biometría lo hace al recibir este aviso (Ley 21.719).
  const rostro = await tx.enrolamientoBiometrico.findUnique({
    where: { personaId: id },
    select: { tenantId: true },
  });
  if (rostro)
    await tx.evento.create({
      data: {
        tenantId: rostro.tenantId,
        tipo: "core.biometria.anonimizacion_pendiente",
        entidadTipo: "persona",
        entidadId: id,
        actorTipo: "system",
        payload: {},
      },
    });
  return true;
}

/** Anonimiza el contacto. Con `corte`, solo si lleva archivado desde antes (política). */
export async function anonimizarContacto(
  tx: TenantTx,
  id: string,
  ahora: Date,
  corte: Date | null,
): Promise<boolean> {
  await bloquear(tx, "contactos", id);
  const { count } = await tx.contacto.updateMany({
    where: {
      id,
      anonimizadoEn: null,
      ...(corte ? { archivadoEn: { not: null, lt: corte } } : {}),
    },
    data: {
      nombres: MARCA_ANONIMO,
      apellidos: "",
      email: null,
      telefono: null,
      cargo: null,
      notas: null,
      estado: "inactivo",
      anonimizadoEn: ahora,
    },
  });
  return count === 1;
}

/**
 * Solicitudes del titular aún abiertas (`recibida`/`en_proceso`), por id o por su correo (una
 * solicitud puede llegar solo con el correo, §10). Se consulta dentro de la transacción que
 * anonimiza: una solicitud que entra entre elegir y escribir también frena la anonimización.
 * `excepto` es la solicitud de cancelación que respalda la acción.
 */
export async function solicitudesAbiertas(
  tx: TenantTx,
  tipo: "persona" | "contacto",
  id: string,
  excepto?: string,
): Promise<number> {
  const correos =
    tipo === "persona"
      ? await tx.persona.findUnique({ where: { id }, select: { emailPersonal: true, emailLaboral: true } })
      : await tx.contacto.findUnique({ where: { id }, select: { email: true } });
  const emails = Object.values(correos ?? {}).filter((v): v is string => typeof v === "string");
  return tx.solicitudArco.count({
    where: {
      estado: { in: ["recibida", "en_proceso"] },
      ...(excepto ? { id: { not: excepto } } : {}),
      OR: [
        { titularTipo: tipo, titularId: id },
        ...(emails.length ? [{ titularEmail: { in: emails } }] : []),
      ],
    },
  });
}
