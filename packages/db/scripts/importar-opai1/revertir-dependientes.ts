// Dependientes en 2.0 que harían CASCADE/SET NULL al borrar filas creadas por una importación.
import type { TenantTx } from "../../src/transaccion";

export type FilaRevertir = {
  entidad: string;
  id10: string;
  id20: string | null;
  accion: string;
  previos: unknown;
};

const despuesDe = (terminadaEn: Date) => ({ gt: terminadaEn }) as const;

const marca = (previos: unknown, clave: string) =>
  Boolean(previos && typeof previos === "object" && (previos as Record<string, unknown>)[clave]);

async function cuentaPostImport(tx: TenantTx, cuentaId: string, terminadaEn: Date): Promise<boolean> {
  const c = despuesDe(terminadaEn);
  const [accesos, config, etiquetas, vinculos, contactos, representantes, negocios] = await Promise.all([
    tx.accesoCliente.count({ where: { cuentaId, createdAt: c } }),
    tx.configPortalCuenta.count({ where: { cuentaId, createdAt: c } }),
    tx.etiquetaAsignacion.count({ where: { cuentaId, createdAt: c } }),
    tx.actividadVinculo.count({ where: { cuentaId, createdAt: c } }),
    tx.contactoCuenta.count({ where: { cuentaId, createdAt: c } }),
    tx.cuentaRepresentante.count({ where: { cuentaId, createdAt: c } }),
    tx.negocio.count({ where: { cuentaId, createdAt: c } }),
  ]);
  return accesos + config + etiquetas + vinculos + contactos + representantes + negocios > 0;
}

async function contactoPostImport(tx: TenantTx, contactoId: string, terminadaEn: Date): Promise<boolean> {
  const c = despuesDe(terminadaEn);
  const [etiquetas, vinculos, contactos, accesos, firmantes] = await Promise.all([
    tx.etiquetaAsignacion.count({ where: { contactoId, createdAt: c } }),
    tx.actividadVinculo.count({ where: { contactoId, createdAt: c } }),
    tx.contactoCuenta.count({ where: { contactoId, createdAt: c } }),
    tx.accesoCliente.count({ where: { contactoId, createdAt: c } }),
    tx.firmante.count({ where: { contactoId, createdAt: c } }),
  ]);
  return etiquetas + vinculos + contactos + accesos + firmantes > 0;
}

async function instalacionPostImport(tx: TenantTx, instalacionId: string, terminadaEn: Date): Promise<boolean> {
  const c = despuesDe(terminadaEn);
  const [supervisores, calendario, accesos, vinculos] = await Promise.all([
    tx.supervisorInstalacion.count({ where: { instalacionId, createdAt: c } }),
    tx.diaCalendario.count({ where: { instalacionId, createdAt: c } }),
    tx.accesoInstalacion.count({ where: { instalacionId, createdAt: c } }),
    tx.actividadVinculo.count({ where: { instalacionId, createdAt: c } }),
  ]);
  return supervisores + calendario + accesos + vinculos > 0;
}

/** Corridas con borrador generado en 2.0 (CAR-159) o creadas tras la importación: no se borran al revertir. */
async function programacionPostImport(tx: TenantTx, programacionId: string, terminadaEn: Date): Promise<boolean> {
  const c = despuesDe(terminadaEn);
  const [corridasNuevas, conDocumento] = await Promise.all([
    tx.ventasProgramacionCorrida.count({ where: { programacionId, createdAt: c } }),
    tx.ventasProgramacionCorrida.count({ where: { programacionId, documentoId: { not: null } } }),
  ]);
  return corridasNuevas + conDocumento > 0;
}

/** Un negocio con cotizaciones, contactos, actividad o cambios de etapa hechos en 2.0 no se borra. */
async function negocioConUso(tx: TenantTx, negocioId: string): Promise<boolean> {
  const [cotizaciones, n] = await Promise.all([
    tx.cpqCotizacion.count({ where: { negocioId } }),
    tx.negocio.findFirst({
      where: { id: negocioId },
      select: { _count: { select: { instalaciones: true, contactos: true, solicitudes: true, actividadVinculos: true, historial: true, contexto: true } } },
    }),
  ]);
  const c = n?._count;
  return cotizaciones > 0 || (c ? c.historial > 0 || c.instalaciones + c.contactos + c.solicitudes + c.actividadVinculos + c.contexto > 0 : false);
}

/** True si borrar o restaurar la fila arrastraría datos añadidos en 2.0 tras la corrida. */
export async function dependientesPostImport(
  tx: TenantTx,
  f: FilaRevertir,
  terminadaEn: Date,
): Promise<boolean> {
  if (!f.id20) return false;
  if (f.entidad === "cuenta") {
    if (f.accion === "creado") return cuentaPostImport(tx, f.id20, terminadaEn);
    if (f.accion === "completado" && marca(f.previos, "_representanteCreado"))
      return (await tx.cuentaRepresentante.count({ where: { cuentaId: f.id20, createdAt: despuesDe(terminadaEn) } })) > 0;
    return false;
  }
  if (f.accion !== "creado") return false;
  if (f.entidad === "contacto") return contactoPostImport(tx, f.id20, terminadaEn);
  if (f.entidad === "instalacion") return instalacionPostImport(tx, f.id20, terminadaEn);
  if (f.entidad === "programacion_recurrente") return programacionPostImport(tx, f.id20, terminadaEn);
  if (f.entidad === "negocio") return negocioConUso(tx, f.id20);
  return false;
}
