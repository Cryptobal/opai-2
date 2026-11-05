import { enTransaccion, registrarEventoSeguridad, type TenantTx } from "@opai/db";
import { PIN_BLOQUEO_MINUTOS_DEFECTO, PIN_INTENTOS_MAXIMOS_DEFECTO, trasFallo } from "@opai/domain";

import { red } from "./rastro-seguridad";
import type { Evaluacion } from "./pin-verificacion";

/** Registro del resultado de un ingreso con PIN (éxito o fallo) y política de bloqueo de la empresa. */
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

export async function registrarExito(
  e: Extract<Evaluacion, { tipo: "ok" }>,
  h: Headers | null,
  nuevoHash: string | null,
  ahora: Date,
) {
  await enTransaccion(e.tenantId, async (tx) => {
    await tx.credencialTerreno.update({
      where: { personaId: e.personaId },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ...(nuevoHash ? { pinHash: nuevoHash, debeCambiar: false, pinCambiadoEn: ahora } : {}),
      },
    });
    await registrarEventoSeguridad(
      {
        tipo: "seguridad.pin.ingreso",
        userId: e.userId,
        tenantId: e.tenantId,
        detalle: nuevoHash ? { resultado: "ok", pin_cambiado: true } : { resultado: "ok" },
        ...datosRed(h),
      },
      tx,
    );
  });
}

export async function registrarFallo(
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
