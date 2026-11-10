// Referencias de clientes con consentimiento (CAR-138 PR 7): vista y lectura del estado vigente.
// El registro es append-only: el estado de cada cuenta es su última fila (otorgamiento o revocación).
import { z } from "zod";

import { diaEnZona, nombreReferencia, referenciaVigente } from "@opai/domain";
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { dia } from "./comun";

export const EVIDENCIAS_REFERENCIA = [
  "correo",
  "documento_firmado",
  "contrato",
  "acta",
  "otro",
] as const;

export const referenciaSchema = z.object({
  id: z.string(),
  cuentaId: z.string(),
  cuentaNombre: z.string(),
  estado: z.enum(["otorgado", "revocado"]),
  /** Otorgado, ya empezó, no venció y la cuenta es cliente activo: solo así sale en documentos. */
  vigente: z.boolean(),
  mostrarNombre: z.boolean(),
  /** Cómo aparece en un documento (anonimizado si no autorizó su nombre). */
  nombrePublico: z.string(),
  descripcion: z.string().nullable(),
  cita: z.string().nullable(),
  otorgadoEn: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  contactoId: z.string().nullable(),
  evidencia: z.enum(EVIDENCIAS_REFERENCIA).nullable(),
  evidenciaDetalle: z.string().nullable(),
  motivo: z.string().nullable(),
  registradoPorId: z.string(),
  registradoEn: z.string(),
});
export type VistaReferencia = z.infer<typeof referenciaSchema>;

export const cuentaDeReferencia = {
  select: {
    nombre: true,
    giro: true,
    comuna: true,
    clienteDesde: true,
    estado: true,
    archivadaEn: true,
  },
} as const;

type Cuenta = {
  nombre: string;
  giro: string | null;
  comuna: string | null;
  clienteDesde: Date | null;
  estado: string;
  archivadaEn: Date | null;
};
export type FilaReferenciaDb = {
  id: string;
  cuentaId: string;
  estado: string;
  mostrarNombre: boolean;
  descripcion: string | null;
  cita: string | null;
  otorgadoEn: Date | null;
  vigenteHasta: Date | null;
  contactoId: string | null;
  evidencia: string | null;
  evidenciaDetalle: string | null;
  motivo: string | null;
  registradoPorId: string;
  createdAt: Date;
  cuenta: Cuenta;
};

export const hoyReferencias = () => diaEnZona(new Date());

/** Vigente para documentos: consentimiento vigente y cuenta cliente activo sin archivar. */
export function esVigente(f: FilaReferenciaDb, hoy: string): boolean {
  return (
    referenciaVigente(f, hoy) &&
    f.cuenta.estado === "cliente_activo" &&
    f.cuenta.archivadaEn === null
  );
}

/**
 * `verEvidencia` en false oculta lo que puede nombrar a una persona del cliente (detalle de la
 * evidencia, motivo y contacto): solo lo ve quien gestiona cuentas o autoriza referencias.
 */
export function vistaReferencia(
  f: FilaReferenciaDb,
  hoy: string,
  verEvidencia = true,
): VistaReferencia {
  const v: VistaReferencia = {
    id: f.id,
    cuentaId: f.cuentaId,
    cuentaNombre: f.cuenta.nombre,
    estado: f.estado === "otorgado" ? "otorgado" : "revocado",
    vigente: esVigente(f, hoy),
    mostrarNombre: f.mostrarNombre,
    nombrePublico: nombreReferencia({ cuenta: f.cuenta, mostrarNombre: f.mostrarNombre }),
    descripcion: f.descripcion,
    cita: f.cita,
    otorgadoEn: dia(f.otorgadoEn),
    vigenteHasta: dia(f.vigenteHasta),
    contactoId: f.contactoId,
    evidencia: (f.evidencia as VistaReferencia["evidencia"]) ?? null,
    evidenciaDetalle: f.evidenciaDetalle,
    motivo: f.motivo,
    registradoPorId: f.registradoPorId,
    registradoEn: f.createdAt.toISOString(),
  };
  return verEvidencia ? v : { ...v, evidenciaDetalle: null, motivo: null, contactoId: null };
}

/**
 * Última fila de cada cuenta que cumple `dondeCuenta`. Se elige la última ANTES de mirar el estado: una
 * revocación posterior manda sobre un otorgamiento anterior.
 */
export async function ultimasReferencias(
  ctx: Pick<Contexto, "db">,
  dondeCuenta: Prisma.CuentaWhereInput,
): Promise<FilaReferenciaDb[]> {
  const filas = await ctx.db.cuentaReferencia.findMany({
    where: { cuenta: dondeCuenta },
    orderBy: [{ cuentaId: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    include: { cuenta: cuentaDeReferencia },
  });
  const vistas = new Set<string>();
  return filas.filter((f) => (vistas.has(f.cuentaId) ? false : (vistas.add(f.cuentaId), true)));
}
