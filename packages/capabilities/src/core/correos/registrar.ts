// Registro en el historial (CAR-233): salientes de OPAI con su origen y entrantes por el buzón de la
// empresa, asociados por correo exacto del contacto y, si no, por dominio de `sitioWeb`.
import {
  asociarCorreo,
  correoDeDireccion,
  correosDe,
  dominioDeCorreo,
  esDireccionOpai,
  esDominioGenerico,
} from "@opai/domain/correos";

import type { Contexto } from "../../types";
import { AMBITO_FINANZAS, type DbOTx, LARGO_TEXTO, type OrigenCorreo, recortar } from "./comun";
import { negocioDelHilo } from "./hilo";

export type RefsCorreo = {
  cuentaId?: string | null;
  contactoId?: string | null;
  negocioId?: string | null;
};

export type Saliente = RefsCorreo & {
  origen: Exclude<OrigenCorreo, "buzon">;
  remitente: string;
  destinatarios: readonly string[];
  asunto: string;
  texto: string;
};

const destinos = (ds: readonly string[]) => ds.map((d) => recortar(d, 320)).slice(0, 50);

/** Registra un correo que OPAI acaba de enviar, ligado a la cuenta, contacto y negocio de origen. */
export async function registrarSaliente(db: DbOTx, tenantId: string, s: Saliente): Promise<void> {
  const refs = {
    cuentaId: s.cuentaId ?? null,
    contactoId: s.contactoId ?? null,
    negocioId: s.negocioId ?? null,
  };
  const asociado = refs.cuentaId || refs.contactoId || refs.negocioId;
  await db.correoCliente.create({
    data: {
      tenantId,
      sentido: "enviado",
      origen: s.origen,
      remitente: recortar(s.remitente, 320),
      destinatarios: destinos(s.destinatarios),
      asunto: recortar(s.asunto, 500),
      texto: recortar(s.texto, LARGO_TEXTO),
      ...refs,
      asociacion: asociado ? "origen" : null,
      ambito: s.origen === "factura" ? AMBITO_FINANZAS : null,
      ocurridoEn: new Date(),
    },
  });
}

/**
 * Saliente de un negocio (seguimiento): toma la cuenta del negocio. No lanza errores de JS: el correo ya
 * salió y un fallo del historial no debe marcar el paso como fallido. La fila no puede violar una
 * restricción (largos recortados, referencias del mismo tenant); un error de Postgres dentro de una
 * transacción la abortaría igual (pendiente: savepoint, ver ESTADO).
 */
export async function registrarSalienteDeNegocio(
  ctx: Contexto,
  negocioId: string,
  s: Omit<Saliente, "cuentaId" | "negocioId">,
) {
  try {
    const n = await ctx.db.negocio.findUnique({
      where: { id: negocioId },
      select: { cuentaId: true },
    });
    await registrarSaliente(ctx.db, ctx.tenantId, {
      ...s,
      negocioId,
      cuentaId: n?.cuentaId ?? null,
    });
  } catch {
    console.warn("[correos] no se registró el saliente en el historial");
  }
}

/** Correos de los usuarios con membresía activa en la empresa (para separar CCO de respuesta). */
async function correosDelEquipo(
  ctx: Contexto,
  candidatos: readonly string[],
): Promise<Set<string>> {
  if (!candidatos.length) return new Set();
  const usuarios = await ctx.db.user.findMany({
    where: { OR: candidatos.map((c) => ({ email: { equals: c, mode: "insensitive" as const } })) },
    select: { id: true, email: true },
  });
  if (!usuarios.length) return new Set();
  const activos = await ctx.db.membership.findMany({
    where: { userId: { in: usuarios.map((u) => u.id) }, estado: "activa" },
    select: { userId: true },
  });
  const ids = new Set(activos.map((m) => m.userId));
  return new Set(usuarios.filter((u) => ids.has(u.id)).map((u) => u.email.toLowerCase()));
}

export type Entrante = {
  remitente: string;
  destinatarios: readonly string[];
  asunto: string | null;
};

/**
 * Sentido y contrapartes de un correo que entró por el buzón: si lo mandó alguien del equipo (CCO del
 * vendedor), es «enviado» y el cliente está en los destinatarios; si no, es «recibido» (respuesta) y el
 * cliente es el remitente. Las direcciones de OPAI y del equipo nunca cuentan como cliente.
 */
export async function sentidoYContrapartes(ctx: Contexto, e: Entrante) {
  const remitente = correoDeDireccion(e.remitente);
  const todos = correosDe([e.remitente, ...e.destinatarios]);
  const equipo = await correosDelEquipo(ctx, todos);
  const enviado = remitente !== null && equipo.has(remitente);
  const lado = enviado ? correosDe(e.destinatarios) : remitente ? [remitente] : [];
  const contrapartes = lado.filter((c) => !esDireccionOpai(c) && !equipo.has(c));
  return { sentido: enviado ? ("enviado" as const) : ("recibido" as const), contrapartes };
}

/** Lee de la empresa solo los candidatos que pueden calzar: contactos por correo y cuentas con sitio. */
async function candidatos(ctx: Contexto, contrapartes: readonly string[]) {
  const contactos = contrapartes.length
    ? await ctx.db.contacto.findMany({
        where: {
          OR: contrapartes.map((c) => ({ email: { equals: c, mode: "insensitive" as const } })),
        },
        select: { id: true, email: true, cuentaId: true },
      })
    : [];
  const dominios = [
    ...new Set(
      contrapartes.map(dominioDeCorreo).filter((d): d is string => !!d && !esDominioGenerico(d)),
    ),
  ];
  const cuentas = dominios.length
    ? await ctx.db.cuenta.findMany({
        where: {
          OR: dominios.map((d) => ({ sitioWeb: { contains: d, mode: "insensitive" as const } })),
        },
        select: { id: true, sitioWeb: true },
        take: 200,
      })
    : [];
  return {
    contactos: contactos.flatMap((c) =>
      c.email ? [{ id: c.id, email: c.email, cuentaId: c.cuentaId }] : [],
    ),
    cuentas,
  };
}

/** Asociación de un correo entrante (cuenta, contacto, negocio del hilo y cómo se asoció). */
export async function asociarEntrante(
  ctx: Contexto,
  contrapartes: readonly string[],
  asunto: string | null,
) {
  const { contactos, cuentas } = await candidatos(ctx, contrapartes);
  const r = asociarCorreo(contrapartes, contactos, cuentas);
  if (r.tipo === "sin_asignar")
    return {
      cuentaId: null,
      contactoId: null,
      negocioId: null,
      asociacion: null,
      motivo: r.motivo,
    };
  const contactoId = r.tipo === "contacto" ? r.contactoId : null;
  const negocioId = await negocioDelHilo(ctx, r.cuentaId, contrapartes, asunto);
  return { cuentaId: r.cuentaId, contactoId, negocioId, asociacion: r.tipo, motivo: null };
}
