// Estado de 2.0 contra el que se calcula el plan. La lectura real va por `enTransaccion` con el rol
// `opai_app` (RLS del tenant): la simulación no escribe ni cruza tenants, así que no usa `dbAdmin()`.
import { enTransaccion, tenantPorSlug } from "../../src/index";
import type { TenantTx } from "../../src/transaccion";
import type { EntidadImportada, EstadoDestino } from "./destino-tipos";
import { SISTEMA_OPAI1 } from "./destino-tipos";

const ENTIDADES = new Set<string>(["cuenta", "contacto", "instalacion"]);
const esEntidad = (t: string): t is EntidadImportada => ENTIDADES.has(t);
const numero = (d: { toNumber(): number } | null) => (d ? d.toNumber() : null);

async function cargarEstadoDestino(tx: TenantTx): Promise<EstadoDestino> {
  // Solo lectura también en la base; secuencial: una transacción interactiva usa una conexión.
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  const cuentas = await tx.cuenta.findMany({
        select: {
          id: true,
          nombre: true,
          razonSocial: true,
          rut: true,
          giro: true,
          calle: true,
          comuna: true,
          ciudad: true,
          emailDte: true,
        },
        orderBy: { id: "asc" },
      });
      const contactos = await tx.contacto.findMany({
        select: {
          id: true,
          cuentaId: true,
          nombres: true,
          apellidos: true,
          email: true,
          telefono: true,
          cargo: true,
          esPrincipal: true,
          roles: true,
        },
        orderBy: { id: "asc" },
      });
      const instalaciones = await tx.instalacion.findMany({
        select: {
          id: true,
          cuentaId: true,
          nombre: true,
          calle: true,
          comuna: true,
          placeId: true,
          lat: true,
          lng: true,
        },
        orderBy: { id: "asc" },
      });
      const vinculos = await tx.contactoCuenta.findMany({
        select: {
          id: true,
          contactoId: true,
          cuentaId: true,
          cargo: true,
          roles: true,
          esPrincipal: true,
        },
        orderBy: { id: "asc" },
      });
      const ids = await tx.idExterno.findMany({
        where: { sistema: SISTEMA_OPAI1 },
        select: { entidadTipo: true, idExterno: true, entidadId: true },
      });
  return {
    cuentas,
    contactos,
    vinculos,
    instalaciones: instalaciones.map((i) => ({ ...i, lat: numero(i.lat), lng: numero(i.lng) })),
    ids: ids.flatMap((i) =>
      esEntidad(i.entidadTipo) ? [{ ...i, entidadTipo: i.entidadTipo }] : [],
    ),
  };
}

const optsLectura = { aislamiento: "RepeatableRead" as const, timeoutMs: 60_000 };

/** Lee el estado 2.0 del tenant por id (capacidad y servidor). */
export async function leerEstadoDestinoPorTenantId(tenantId: string): Promise<EstadoDestino> {
  return enTransaccion(tenantId, cargarEstadoDestino, optsLectura);
}

/** Lee el estado 2.0 del tenant en una sola transacción de solo lectura (snapshot consistente). */
export async function leerEstadoDestino(
  slug: string,
): Promise<{ tenantId: string; estado: EstadoDestino } | null> {
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  const estado = await leerEstadoDestinoPorTenantId(tenant.id);
  return { tenantId: tenant.id, estado };
}
