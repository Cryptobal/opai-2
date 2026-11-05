import {
  credencialesTerrenoPorRut,
  enTransaccion,
  HASH_PIN_SIN_PERSONA,
  registrarEventoSeguridad,
  type TenantTx,
  verificarPin,
} from "@opai/db";
import {
  estaBloqueada,
  normalizarRut,
  PIN_BLOQUEO_MINUTOS_DEFECTO,
  PIN_INTENTOS_MAXIMOS_DEFECTO,
  pinConFormato,
  trasFallo,
} from "@opai/domain";

import { red } from "./rastro-seguridad";

/** Verificación de RUT + PIN contra la base (sin sesión): ver `pin.ts` para las garantías. */
const PORTALES_PIN = ["trabajador", "terreno"] as const;
type Politica = { intentosMaximos: number; bloqueoMinutos: number };

async function leerPolitica(tx: TenantTx, tenantId: string): Promise<Politica> {
  const filas = await tx.ajuste.findMany({
    where: {
      ambito: "tenant",
      sujetoId: tenantId,
      modulo: "core",
      clave: { in: ["terreno_pin_intentos_maximos", "terreno_pin_bloqueo_minutos"] },
    },
    select: { clave: true, valor: true },
  });
  const num = (clave: string, defecto: number, min: number, max: number) => {
    const v = filas.find((f) => f.clave === clave)?.valor;
    return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : defecto;
  };
  return {
    intentosMaximos: num("terreno_pin_intentos_maximos", PIN_INTENTOS_MAXIMOS_DEFECTO, 3, 10),
    bloqueoMinutos: num("terreno_pin_bloqueo_minutos", PIN_BLOQUEO_MINUTOS_DEFECTO, 5, 1440),
  };
}

type Evaluacion =
  | { tipo: "ok"; tenantId: string; personaId: string; userId: string; debeCambiar: boolean }
  /** PIN o portal incorrectos en una credencial viva: cuenta como intento fallido. */
  | { tipo: "fallo"; tenantId: string; personaId: string; userId: string; causa: "pin" | "portal" }
  /** Sin credencial viva, bloqueada o mal vinculada: no verifica nada ni cuenta. */
  | { tipo: "ignorar" };

/**
 * Evalúa una empresa SIN escribir. Separar evaluar de registrar importa: el mismo RUT puede existir en
 * dos empresas, y el fallo contra una no debe contar si el PIN era el de la otra.
 */
async function evaluar(
  tenantId: string,
  personaId: string,
  rut: string,
  pin: string,
  ahora: Date,
): Promise<Evaluacion> {
  return enTransaccion(tenantId, async (tx) => {
    const cred = await tx.credencialTerreno.findUnique({ where: { personaId } });
    const persona = await tx.persona.findFirst({
      where: { id: personaId, estado: "activa", archivadaEn: null, anonimizadaEn: null },
      select: { rut: true, usuarioId: true },
    });
    if (!cred || !persona || persona.rut !== rut || cred.rut !== rut || !persona.usuarioId) {
      await verificarPin(pin, HASH_PIN_SIN_PERSONA);
      return { tipo: "ignorar" };
    }
    // Una credencial bloqueada no verifica nada: ni acierta ni cuenta (no se adivina durante el bloqueo).
    if (estaBloqueada(cred.bloqueadoHasta, ahora)) return { tipo: "ignorar" };
    const membresia = await tx.membership.findFirst({
      where: { tenantId, userId: persona.usuarioId, estado: "activa" },
      select: { portales: true },
    });
    const soloTerreno =
      !!membresia &&
      membresia.portales.length > 0 &&
      membresia.portales.every((p) => (PORTALES_PIN as readonly string[]).includes(p));
    const correcto = await verificarPin(pin, cred.pinHash);
    const base = { tenantId, personaId, userId: persona.usuarioId };
    if (correcto && soloTerreno) return { tipo: "ok", ...base, debeCambiar: cred.debeCambiar };
    return { tipo: "fallo", ...base, causa: correcto ? "portal" : "pin" };
  });
}

async function registrarExito(e: Extract<Evaluacion, { tipo: "ok" }>, h: Headers | null) {
  await enTransaccion(e.tenantId, async (tx) => {
    await tx.credencialTerreno.update({
      where: { personaId: e.personaId },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
    await registrarEventoSeguridad(
      {
        tipo: "seguridad.pin.ingreso",
        userId: e.userId,
        tenantId: e.tenantId,
        detalle: { resultado: "ok" },
        ...datosRed(h),
      },
      tx,
    );
  });
}

async function registrarFallo(
  e: Extract<Evaluacion, { tipo: "fallo" }>,
  h: Headers | null,
  ahora: Date,
) {
  await enTransaccion(e.tenantId, async (tx) => {
    const cred = await tx.credencialTerreno.findUnique({ where: { personaId: e.personaId } });
    if (!cred) return;
    const politica = await leerPolitica(tx, e.tenantId);
    const nuevo = trasFallo(
      { intentosFallidos: cred.intentosFallidos, bloqueadoHasta: cred.bloqueadoHasta },
      ahora,
      politica,
    );
    await tx.credencialTerreno.update({ where: { personaId: e.personaId }, data: nuevo });
    await registrarEventoSeguridad(
      {
        tipo: nuevo.bloqueadoHasta ? "seguridad.pin.bloqueo" : "seguridad.pin.ingreso",
        userId: e.userId,
        tenantId: e.tenantId,
        detalle: nuevo.bloqueadoHasta
          ? { resultado: "bloqueado", minutos: politica.bloqueoMinutos }
          : { resultado: "fallido", motivo: e.causa },
        ...datosRed(h),
      },
      tx,
    );
  });
}

const datosRed = (h: Headers | null) => (h ? red(h) : { ipHmac: null, userAgent: null });

/** Usuario de la primera empresa cuyo PIN coincide con el RUT, o null ante cualquier problema. */
export async function verificarRutYPin(
  rutEntrada: string,
  pin: string,
  h: Headers | null,
  ahora = new Date(),
): Promise<{ userId: string; debeCambiar: boolean } | null> {
  const rut = normalizarRut(rutEntrada);
  if (!rut || !pinConFormato(pin)) {
    await verificarPin("000000", HASH_PIN_SIN_PERSONA);
    return null;
  }
  const candidatas = (await credencialesTerrenoPorRut(rut)).slice(0, 5);
  if (candidatas.length === 0) {
    await verificarPin(pin, HASH_PIN_SIN_PERSONA);
    return null;
  }
  // El mismo RUT puede estar en más de una empresa: gana la primera cuyo PIN coincide. Los fallos solo
  // se cuentan si ninguna coincidió.
  const evaluaciones: Evaluacion[] = [];
  for (const c of candidatas)
    evaluaciones.push(await evaluar(c.tenantId, c.personaId, rut, pin, ahora));
  const ok = evaluaciones.find((x): x is Extract<Evaluacion, { tipo: "ok" }> => x.tipo === "ok");
  if (ok) {
    await registrarExito(ok, h);
    return { userId: ok.userId, debeCambiar: ok.debeCambiar };
  }
  for (const f of evaluaciones) if (f.tipo === "fallo") await registrarFallo(f, h, ahora);
  return null;
}
