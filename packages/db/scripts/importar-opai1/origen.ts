// Origen de la importación desde OPAI 1.0 (Brief 07): filas de 1.0 validadas con Zod en el borde.
// Los nombres de campo siguen el schema de 1.0 (`extraccion/comercial-y-cpq.md`). Solo lectura.
import { readFile } from "node:fs/promises";

import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });
const texto = z.string().nullish();
const bandera = z.boolean().default(false);

export const cuentaOpai1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  legalName: texto,
  rut: texto,
  industry: texto,
  segment: texto,
  size: texto,
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

export const datosOpai1 = z.object({
  accounts: z.array(cuentaOpai1).default([]),
  contacts: z.array(contactoOpai1).default([]),
  installations: z.array(instalacionOpai1).default([]),
  pipelineStages: z.array(etapaOpai1).default([]),
  deals: z.array(negocioOpai1).default([]),
  dealStageHistory: z.array(historialEtapaOpai1).default([]),
  dealContacts: z.array(negocioContactoOpai1).default([]),
});

export type CuentaOpai1 = z.infer<typeof cuentaOpai1>;
export type ContactoOpai1 = z.infer<typeof contactoOpai1>;
export type InstalacionOpai1 = z.infer<typeof instalacionOpai1>;
export type EtapaOpai1 = z.infer<typeof etapaOpai1>;
export type NegocioOpai1 = z.infer<typeof negocioOpai1>;
export type HistorialEtapaOpai1 = z.infer<typeof historialEtapaOpai1>;
export type NegocioContactoOpai1 = z.infer<typeof negocioContactoOpai1>;
export type DatosOpai1 = z.infer<typeof datosOpai1>;

/** Fuente de las filas de 1.0. La simulación y la carga real usan la misma interfaz. */
export interface LectorOrigen {
  readonly descripcion: string;
  leer(): Promise<DatosOpai1>;
}

/** Valida un objeto ya parseado. El error nombra solo rutas y tipos, nunca valores (Ley 21.719). */
export function validarDatos(crudo: unknown): DatosOpai1 {
  const r = datosOpai1.safeParse(crudo);
  if (r.success) return r.data;
  const rutas = r.error.issues.slice(0, 10).map((i) => `${i.path.join(".")} (${i.code})`);
  throw new Error(`Origen inválido: ${rutas.join("; ")}`);
}

/** Fixtures JSON locales (datos ficticios). */
export function lectorFixtures(ruta: string): LectorOrigen {
  return {
    descripcion: "fixtures",
    async leer() {
      let crudo: unknown;
      try {
        crudo = JSON.parse(await readFile(ruta, "utf8"));
      } catch {
        // El mensaje de JSON.parse puede citar un trozo del archivo: no se repite en el log.
        throw new Error("JSON inválido en el origen.");
      }
      return validarDatos(crudo);
    },
  };
}

/**
 * Lector por API/MCP de OPAI 1.0: pendiente. Necesita una key dedicada de 1.0, de solo lectura, que
 * crea Carlos y que viviría en el almacén cifrado del tenant (ADR-027), nunca en `.env` ni en el chat.
 * Hasta entonces falla cerrado y no intenta ninguna conexión.
 */
export function lectorApiOpai1(): LectorOrigen {
  return {
    descripcion: "opai1",
    leer() {
      return Promise.reject(
        new Error(
          "Lector de OPAI 1.0 no configurado: falta la key dedicada de 1.0 en el almacén cifrado del tenant. Usa --origen fixtures:<ruta>.",
        ),
      );
    },
  };
}
