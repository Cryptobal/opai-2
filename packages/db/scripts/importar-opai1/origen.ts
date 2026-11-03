// Origen de la importación desde OPAI 1.0 (Brief 07): filas de 1.0 validadas con Zod en el borde.
// Los nombres de campo siguen el schema de 1.0 (`extraccion/comercial-y-cpq.md`). Solo lectura.
import { z } from "zod";

import { cotizacionOpai1, programacionRecurrenteOpai1 } from "./origen-recurrentes-cpq";

export {
  cotizacionOpai1,
  lineaRecurrenteOpai1,
  programacionRecurrenteOpai1,
  referenciaRecurrenteOpai1,
} from "./origen-recurrentes-cpq";
export type { CotizacionOpai1, ProgramacionRecurrenteOpai1 } from "./origen-recurrentes-cpq";

const fecha = z.iso.datetime({ offset: true });
const texto = z.string().nullish();
const bandera = z.boolean().default(false);

export const cuentaOpai1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  legalName: texto,
  rut: texto,
  /** Actividad económica SII (distinto de `industry` interno). */
  giro: texto,
  industry: texto,
  segment: texto,
  size: texto,
  address: texto,
  commune: texto,
  city: texto,
  /** Correo receptor DTE en la cuenta (no sustituye contactos con rol facturación). */
  emailDte: texto,
  /** `prospect | client_active | client_inactive`; si falta se usa `type` / `isActive` heredados. */
  status: texto,
  type: texto,
  isActive: z.boolean().nullish(),
  legalRepresentativeName: texto,
  legalRepresentativeRut: texto,
  notaryName: texto,
  notaryDate: texto,
  ownerId: texto,
  startDate: texto,
  endDate: texto,
  createdAt: fecha,
  updatedAt: fecha,
});

export const contactoOpai1 = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  firstName: z.string(),
  lastName: z.string().default(""),
  email: texto,
  phone: texto,
  roleTitle: texto,
  isPrimary: bandera,
  recibeFacturacion: bandera,
  recibeNotasCredito: bandera,
  recibeCobranza: bandera,
  recibeOperacional: bandera,
  recibeCesion: bandera,
  createdAt: fecha,
  updatedAt: fecha,
});

export const instalacionOpai1 = z.object({
  id: z.string().min(1),
  accountId: texto,
  leadId: texto,
  name: z.string().min(1),
  address: texto,
  commune: texto,
  placeId: texto,
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  activatedByDealId: texto,
  /** `prospect | active | inactive`. */
  status: texto,
  createdAt: fecha,
  updatedAt: fecha,
});

export const etapaOpai1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
  isClosedWon: bandera,
  isClosedLost: bandera,
  isAccepted: bandera,
});

export const negocioOpai1 = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string(),
  installationName: texto,
  lostReasonCategory: texto,
  createdAt: fecha,
});

export const historialEtapaOpai1 = z.object({
  id: z.string().min(1),
  dealId: z.string().min(1),
  fromStageId: texto,
  toStageId: z.string().min(1),
  changedAt: fecha,
});

export const negocioContactoOpai1 = z.object({
  id: z.string().min(1),
  dealId: z.string().min(1),
  contactId: z.string().min(1),
  role: z.string().default("participant"),
});

export const usuarioOpai1 = z.object({
  id: z.string().min(1),
  email: z.string().email(),
});

export const datosOpai1 = z.object({
  accounts: z.array(cuentaOpai1).default([]),
  contacts: z.array(contactoOpai1).default([]),
  installations: z.array(instalacionOpai1).default([]),
  pipelineStages: z.array(etapaOpai1).default([]),
  deals: z.array(negocioOpai1).default([]),
  dealStageHistory: z.array(historialEtapaOpai1).default([]),
  dealContacts: z.array(negocioContactoOpai1).default([]),
  recurringInvoiceSchedules: z.array(programacionRecurrenteOpai1).default([]),
  cpqQuotes: z.array(cotizacionOpai1).default([]),
  users: z.array(usuarioOpai1).default([]),
});

export type CuentaOpai1 = z.infer<typeof cuentaOpai1>;
export type ContactoOpai1 = z.infer<typeof contactoOpai1>;
export type InstalacionOpai1 = z.infer<typeof instalacionOpai1>;
export type EtapaOpai1 = z.infer<typeof etapaOpai1>;
export type NegocioOpai1 = z.infer<typeof negocioOpai1>;
export type HistorialEtapaOpai1 = z.infer<typeof historialEtapaOpai1>;
export type NegocioContactoOpai1 = z.infer<typeof negocioContactoOpai1>;
export type UsuarioOpai1 = z.infer<typeof usuarioOpai1>;
export type DatosOpai1 = z.infer<typeof datosOpai1>;

export type { LectorOrigen } from "./origen-lectores";
export { lectorApiOpai1, lectorFixtures, validarDatos } from "./origen-lectores";
