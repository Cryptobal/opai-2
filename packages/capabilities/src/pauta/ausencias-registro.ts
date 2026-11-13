import type { TenantTx } from "@opai/db";

/**
 * Registro de ausencias de la persona (CAR-393): al anular turnos, el registro que ya no tiene ningún turno activo
 * en la pauta queda anulado, con quién y cuándo. Una anulación parcial (algunos días) deja el registro aprobado.
 */
export async function anularRegistrosSinTurnos(
  tx: Pick<TenantTx, "excepcionPauta" | "ausencia" | "$queryRaw">,
  tenantId: string,
  ausenciaIds: readonly (string | null)[],
  usuarioId: string | null,
): Promise<number> {
  const ids = [...new Set(ausenciaIds.filter((x): x is string => x !== null))].sort();
  if (ids.length === 0) return 0;
  // Bloquea los registros antes de contar: dos anulaciones simultáneas de puestos del mismo registro se ordenan y la
  // segunda ve lo que confirmó la primera (READ COMMITTED), así ninguno queda aprobado sin turnos.
  await tx.$queryRaw`SELECT id FROM core.ausencias WHERE id = ANY(${ids}::uuid[]) AND tenant_id = ${tenantId}::uuid ORDER BY id FOR UPDATE`;
  const conActivas = await tx.excepcionPauta.findMany({
    where: { ausenciaId: { in: ids }, estado: "activa" },
    select: { ausenciaId: true },
    distinct: ["ausenciaId"],
  });
  const siguen = new Set(conActivas.map((e) => e.ausenciaId));
  const anular = ids.filter((id) => !siguen.has(id));
  if (anular.length === 0) return 0;
  const r = await tx.ausencia.updateMany({
    where: { id: { in: anular }, estado: { not: "anulada" } },
    data: { estado: "anulada", anuladaPor: usuarioId, anuladaEn: new Date() },
  });
  return r.count;
}

/**
 * Registros de las personas afectadas por una excepción creada desde la pauta de un puesto (`pauta.excepciones.crear`):
 * uno por titular, del primer al último día que le toca. Devuelve el registro de cada persona para enlazar sus turnos.
 */
export async function registrarDesdePauta(
  tx: Pick<TenantTx, "ausencia">,
  r: {
    tenantId: string;
    tipo: string;
    motivo: string;
    usuarioId: string | null;
    ahora: Date;
    dias: readonly { fecha: Date; personaId: string | null }[];
  },
): Promise<Map<string, string>> {
  const rangos = new Map<string, { desde: Date; hasta: Date }>();
  for (const d of r.dias) {
    if (!d.personaId) continue;
    const x = rangos.get(d.personaId);
    if (!x) rangos.set(d.personaId, { desde: d.fecha, hasta: d.fecha });
    else {
      if (d.fecha < x.desde) x.desde = d.fecha;
      if (d.fecha > x.hasta) x.hasta = d.fecha;
    }
  }
  const ids = new Map<string, string>();
  for (const [personaId, { desde, hasta }] of rangos) {
    const a = await tx.ausencia.create({
      data: {
        tenantId: r.tenantId,
        personaId,
        tipo: r.tipo,
        desde,
        hasta,
        motivo: r.motivo,
        estado: "aprobada",
        registradaPor: r.usuarioId,
        aprobadaPor: r.usuarioId,
        aprobadaEn: r.ahora,
        createdAt: r.ahora,
      },
      select: { id: true },
    });
    ids.set(personaId, a.id);
  }
  return ids;
}
