import type { TenantTx } from "@opai/db";

// Anonimización de identidad (Ley 21.719, Brief 07d §4.5). Quita lo que identifica al titular y deja
// íntegros los hechos que dependen de su id (vínculos, remuneración, bitácora; ADR-023). Toda
// escritura es condicional (`anonimizadaEn: null` + el predicado de elegibilidad en la misma
// sentencia), así que repetirla no hace nada y no hay TOCTOU entre elegir y escribir.

export const MARCA_ANONIMO = "[anonimizado]";

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
      estado: "inactiva",
      anonimizadaEn: ahora,
    },
  });
  if (count !== 1) return false;
  // Los ids de otros sistemas llevan de vuelta a la identidad: se sueltan.
  await tx.idExterno.deleteMany({ where: { entidadTipo: "persona", entidadId: id } });
  return true;
}

/** Anonimiza el contacto. Con `corte`, solo si lleva archivado desde antes (política). */
export async function anonimizarContacto(
  tx: TenantTx,
  id: string,
  ahora: Date,
  corte: Date | null,
): Promise<boolean> {
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
