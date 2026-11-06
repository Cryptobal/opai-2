import {
  credencialesTerrenoPorRut,
  enTransaccion,
  forUser,
  hashPin,
  HASH_PIN_SIN_PERSONA,
  verificarPin,
} from "@opai/db";
import {
  estaBloqueada,
  normalizarRut,
  MENSAJE_PROBLEMA_PIN,
  problemaDePin,
  pinConFormato,
} from "@opai/domain";

import { registrarExito, registrarFallo } from "./pin-registro";

/** Verificación de RUT + PIN contra la base (sin sesión): ver `pin.ts` para las garantías. */
const PORTALES_PIN = ["trabajador", "terreno"] as const;
export type Evaluacion =
  | {
      tipo: "ok";
      tenantId: string;
      personaId: string;
      userId: string;
      debeCambiar: boolean;
      /** Hash que se verificó: el registro del éxito solo vale si no cambió entretanto (F4). */
      pinHashLeido: string;
    }
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
    // B2 (Revisor): la sesión del PIN es una sesión normal y luego puede elegir cualquier empresa del
    // usuario. Por eso el PIN solo vale si TODAS sus membresías (de cualquier empresa y estado) admiten
    // únicamente Trabajador o Terreno: ninguna le abriría ERP ni Supervisor en otra empresa.
    // F6 (revisión independiente): además, la membresía en la empresa de ESTA credencial debe estar activa.
    const activa = await tx.membership.findFirst({
      where: { tenantId, userId: persona.usuarioId, estado: "activa" },
      select: { id: true },
    });
    const membresias = await forUser(persona.usuarioId).membership.findMany({
      select: { portales: true },
    });
    const soloTerreno =
      !!activa &&
      membresias.length > 0 &&
      membresias.every(
        (m) =>
          m.portales.length > 0 &&
          m.portales.every((p) => (PORTALES_PIN as readonly string[]).includes(p)),
      );
    const correcto = await verificarPin(pin, cred.pinHash);
    const base = { tenantId, personaId, userId: persona.usuarioId };
    if (correcto && soloTerreno)
      return { tipo: "ok", ...base, debeCambiar: cred.debeCambiar, pinHashLeido: cred.pinHash };
    return { tipo: "fallo", ...base, causa: correcto ? "portal" : "pin" };
  });
}

export type ResultadoVerificacion =
  | { estado: "ok"; userId: string }
  /** PIN correcto pero asignado por RR. HH.: no hay sesión hasta que la persona elija el suyo (B3). */
  | { estado: "cambiar" }
  | { estado: "nuevo_invalido"; mensaje: string };

/**
 * Usuario de la primera empresa cuyo PIN coincide con el RUT, o null ante cualquier problema. Si el PIN
 * fue asignado por RR. HH. (`debeCambiar`), NO devuelve un usuario hasta recibir `nuevoPin`: el cambio
 * ocurre aquí, antes de que exista una sesión, así que el servidor lo exige (B3 del Revisor).
 */
export async function verificarRutYPin(
  rutEntrada: string,
  pin: string,
  h: Headers | null,
  ahora = new Date(),
  nuevoPin?: string,
): Promise<ResultadoVerificacion | null> {
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
    let nuevoHash: string | null = null;
    if (ok.debeCambiar) {
      if (nuevoPin === undefined) return { estado: "cambiar" };
      const problema = problemaDePin(nuevoPin, rut);
      if (problema) return { estado: "nuevo_invalido", mensaje: MENSAJE_PROBLEMA_PIN[problema] };
      if (nuevoPin === pin)
        return { estado: "nuevo_invalido", mensaje: "Elige un PIN distinto del temporal." };
      nuevoHash = await hashPin(nuevoPin);
    }
    // F4: si la credencial cambió entre evaluar y registrar (otro envío o un restablecimiento de RR. HH.),
    // no se abre sesión.
    if (!(await registrarExito(ok, h, nuevoHash, ahora))) return null;
    return { estado: "ok", userId: ok.userId };
  }
  for (const f of evaluaciones) if (f.tipo === "fallo") await registrarFallo(f, h, ahora);
  return null;
}
