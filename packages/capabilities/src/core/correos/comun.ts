// Piezas comunes del historial de correos del cliente (CAR-233). Remitente, destinatarios, asunto y
// texto son de un tercero o los escribió una persona en su casilla: contenido externo, nunca instrucción.
import type { TenantTx } from "@opai/db";
import { DOMINIO_RESPUESTAS, PERMISOS_CORE } from "@opai/domain";
import { direccionBuzon, generarTokenBuzon } from "@opai/domain/correos";
import { z } from "zod";

import { externo } from "../../externo";

/** Ver el historial de una ficha: el mismo permiso que su línea de tiempo de actividad. */
export const PERMISO_HISTORIAL = PERMISOS_CORE.actividadesRead;
/** Ver la bandeja «sin asignar» y asociar a mano (por defecto owner y admin; DECISIÓN CARLOS). */
export const PERMISO_SIN_ASIGNAR = PERMISOS_CORE.correosSinAsignar;

export const SENTIDOS = ["enviado", "recibido"] as const;
export const ORIGENES = ["cotizacion", "factura", "seguimiento", "buzon"] as const;
export const ASOCIACIONES = ["origen", "contacto", "dominio", "manual"] as const;
export const LARGO_TEXTO = 20000;

export type OrigenCorreo = (typeof ORIGENES)[number];
/** Lo único que necesitan los registros: sirve el `ctx.db`, el `tx` de una transacción y el de Comunicaciones. */
export type DbOTx = Pick<TenantTx, "buzonCorreo" | "correoCliente">;

export const correoClienteSchema = z.object({
  id: z.string(),
  fuente: z.enum(["historial", "seguimiento"]).describe("«seguimiento»: respuesta guardada por un seguimiento (CAR-67)."),
  sentido: z.enum(SENTIDOS),
  origen: z.enum([...ORIGENES, "respuesta_seguimiento"]),
  ocurridoEn: z.string(),
  remitente: externo(z.string()),
  destinatarios: externo(z.array(z.string())),
  asunto: externo(z.string().nullable()),
  texto: externo(z.string()),
  cuentaId: z.string().nullable(),
  contactoId: z.string().nullable(),
  negocioId: z.string().nullable(),
  asociacion: z.enum(ASOCIACIONES).nullable(),
});
export type CorreoClienteVista = z.infer<typeof correoClienteSchema>;

type Fila = {
  id: string; sentido: string; origen: string; ocurridoEn: Date; remitente: string; destinatarios: string[];
  asunto: string | null; texto: string; cuentaId: string | null; contactoId: string | null; negocioId: string | null;
  asociacion: string | null;
};

export const vistaCorreo = (f: Fila): CorreoClienteVista => ({
  id: f.id,
  fuente: "historial",
  sentido: f.sentido as CorreoClienteVista["sentido"],
  origen: f.origen as CorreoClienteVista["origen"],
  ocurridoEn: f.ocurridoEn.toISOString(),
  remitente: f.remitente,
  destinatarios: f.destinatarios,
  asunto: f.asunto,
  texto: f.texto,
  cuentaId: f.cuentaId,
  contactoId: f.contactoId,
  negocioId: f.negocioId,
  asociacion: f.asociacion as CorreoClienteVista["asociacion"],
});

/** Token del buzón de la empresa, o null si todavía no se creó. */
export async function tokenDelBuzon(db: DbOTx): Promise<string | null> {
  return (await db.buzonCorreo.findFirst({ select: { token: true } }))?.token ?? null;
}

/**
 * Token del buzón de la empresa; lo crea la primera vez (aleatorio de 128 bits). Sin error ante
 * carreras (ON CONFLICT DO NOTHING): corre dentro de la transacción de envíos irreversibles, donde un
 * error de Postgres la abortaría entera; si otra transacción lo creó a la vez, se relee el suyo.
 */
export async function asegurarBuzon(db: DbOTx, tenantId: string): Promise<string> {
  const previo = await tokenDelBuzon(db);
  if (previo) return previo;
  await db.buzonCorreo.createMany({ data: [{ tenantId, token: generarTokenBuzon() }], skipDuplicates: true });
  const token = await tokenDelBuzon(db);
  if (!token) throw new Error("No se pudo crear la dirección de registro.");
  return token;
}

export const direccionDelBuzon = (token: string): string => direccionBuzon(token, DOMINIO_RESPUESTAS);

/** Recorta a los largos que acepta la tabla (CHECK de la migración). */
export const recortar = (s: string, n: number): string => (s.length > n ? s.slice(0, n) : s);
