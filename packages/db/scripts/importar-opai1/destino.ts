// Estado de 2.0 contra el que se calcula el plan. La lectura real va por `enTransaccion` con el rol
// `opai_app` (RLS del tenant): la simulación no escribe ni cruza tenants, así que no usa `dbAdmin()`.
import { enTransaccion, tenantPorSlug } from "../../src/index";
import type { EntidadImportada, EstadoDestino } from "./destino-tipos";
import { SISTEMA_OPAI1 } from "./destino-tipos";

const ENTIDADES = new Set<string>(["cuenta", "contacto", "instalacion"]);
const esEntidad = (t: string): t is EntidadImportada => ENTIDADES.has(t);
const numero = (d: { toNumber(): number } | null) => (d ? d.toNumber() : null);

/** Lee el estado 2.0 del tenant en una sola transacción de solo lectura (snapshot consistente). */
export async function leerEstadoDestino(
  slug: string,
): Promise<{ tenantId: string; estado: EstadoDestino } | null> {
  const tenant = await tenantPorSlug(slug);
  if (!tenant) return null;
  const estado = await enTransaccion(
    tenant.id,
    async (tx) => {
      // Solo lectura también en la base; secuencial: una transacción interactiva usa una conexión.
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const cuentas = await tx.cuenta.findMany({
        select: { id: true, nombre: true, razonSocial: true, rut: true },
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
      const ids = await tx.idExterno.findMany({
        where: { sistema: SISTEMA_OPAI1 },
        select: { entidadTipo: true, idExterno: true, entidadId: true },
      });
      return {
        cuentas,
        contactos,
        instalaciones: instalaciones.map((i) => ({ ...i, lat: numero(i.lat), lng: numero(i.lng) })),
        ids: ids.flatMap((i) =>
          esEntidad(i.entidadTipo) ? [{ ...i, entidadTipo: i.entidadTipo }] : [],
        ),
      };
    },
    { aislamiento: "RepeatableRead", timeoutMs: 60_000 },
  );
  return { tenantId: tenant.id, estado };
}
