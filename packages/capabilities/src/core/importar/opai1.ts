// Adaptador de los exportes de OPAI 1 (contrato JSON de `@opai/db/importar-opai1`, CAR-158): convierte la
// parte del export que corresponde a cada importador en filas con las columnas del motor. Solo lee el
// JSON que se le entrega; nunca consulta OPAI 1. Los ids de 1.0 viajan como `id_externo` con sistema
// «opai1», el mismo de la importación técnica anterior, así que reconoce lo que ya se trajo y no lo duplica.
import { ErrorPlanilla } from "@opai/domain/importacion";
import { z } from "zod";

const t = z.string().nullish();
const cuenta = z.object({
  id: z.string(), name: z.string(), legalName: t, rut: t, giro: t, status: t, type: t, isActive: z.boolean().nullish(),
  address: t, commune: t, city: t, emailDte: t, startDate: t,
});
const contacto = z.object({
  id: z.string(), accountId: z.string(), firstName: z.string(), lastName: t, email: t, phone: t, roleTitle: t,
  isPrimary: z.boolean().nullish(), recibeFacturacion: z.boolean().nullish(), recibeCobranza: z.boolean().nullish(), recibeOperacional: z.boolean().nullish(),
});
const instalacion = z.object({ id: z.string(), accountId: t, name: z.string(), address: t, commune: t, lat: z.number().nullish(), lng: z.number().nullish(), status: t });
const etapa = z.object({ id: z.string(), name: z.string() });
const negocio = z.object({
  id: z.string(), accountId: z.string(), stageId: z.string(), title: z.string(), amount: z.number().nullish(),
  probability: z.number().nullish(), expectedCloseDate: t, ownerId: t,
});
const exporte = z.object({
  accounts: z.array(cuenta).default([]),
  contacts: z.array(contacto).default([]),
  installations: z.array(instalacion).default([]),
  pipelineStages: z.array(etapa).default([]),
  deals: z.array(negocio).default([]),
  users: z.array(z.object({ id: z.string(), email: z.string() })).default([]),
});

type Fila = Record<string, string | number | boolean | null>;
const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

function estadoCuenta(c: z.infer<typeof cuenta>): string {
  if (c.status) return c.status;
  if (c.type === "client") return c.isActive === false ? "client_inactive" : "client_active";
  return "prospect";
}

const rolesDe = (c: z.infer<typeof contacto>) =>
  [c.recibeFacturacion && "facturacion", c.recibeCobranza && "cobranza", c.recibeOperacional && "operacional"].filter(Boolean).join(", ");

/** Filas del export de OPAI 1 para un importador. Lanza `ErrorPlanilla` si el JSON no tiene la forma del export. */
export function filasDeOpai1(importador: string, json: unknown): Fila[] {
  const r = exporte.safeParse(json);
  if (!r.success) throw new ErrorPlanilla("El JSON no tiene la forma del export de OPAI 1 (accounts, contacts, installations, deals).");
  const d = r.data;
  const etapas = new Map(d.pipelineStages.map((e) => [e.id, e.name]));
  const correos = new Map(d.users.map((u) => [u.id, u.email]));
  const filas: Fila[] =
    importador === "cuentas"
      ? d.accounts.map((c) => ({
          id_externo: c.id, nombre: c.name, razon_social: c.legalName ?? null, rut: c.rut ?? null, giro: c.giro ?? null,
          estado: estadoCuenta(c), calle: c.address ?? null, comuna: c.commune ?? null, ciudad: c.city ?? null,
          email_dte: c.emailDte ?? null, cliente_desde: dia(c.startDate),
        }))
      : importador === "contactos"
        ? d.contacts.map((c) => ({
            id_externo: c.id, cuenta_id_externo: c.accountId, nombres: c.firstName, apellidos: c.lastName ?? null, email: c.email ?? null,
            telefono: c.phone ?? null, cargo: c.roleTitle ?? null, es_principal: c.isPrimary === true, roles: rolesDe(c),
          }))
        : importador === "instalaciones"
          ? d.installations.filter((i) => i.accountId).map((i) => ({
              id_externo: i.id, cuenta_id_externo: i.accountId ?? null, nombre: i.name, estado: i.status ?? null,
              calle: i.address ?? null, comuna: i.commune ?? null, lat: i.lat ?? null, lng: i.lng ?? null,
            }))
          : importador === "negocios"
            ? d.deals.map((n) => ({
                id_externo: n.id, cuenta_id_externo: n.accountId, titulo: n.title, etapa: etapas.get(n.stageId) ?? null,
                monto_estimado_mensual: n.amount ?? null, probabilidad: n.probability ?? null,
                cierre_estimado: dia(n.expectedCloseDate), responsable_email: correos.get(n.ownerId ?? "") ?? null,
              }))
            : [];
  if (!filas.length) throw new ErrorPlanilla("El export de OPAI 1 no trae registros para este importador.");
  return filas;
}
