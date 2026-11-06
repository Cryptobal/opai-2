import { registrarEventoSeguridad } from "./eventos-seguridad";
import type { TenantTx } from "./transaccion";

/**
 * Bloqueo del PIN de terreno (CAR-78 · B1, decisión de Carlos del 5-nov-2026 sobre F5). Se llama UNA vez,
 * en la transacción que pasa la credencial de «contando intentos» a «pausada», así que hay un aviso por
 * bloqueo y no se puede inundar a nadie: mientras dura la pausa no se vuelve a contar ni a avisar.
 *
 * Deja el rastro `seguridad.pin.bloqueo` y los avisos internos (campana): a la persona, para que avise si
 * no fue ella, y a RR. HH. de la empresa (owner, admin y gerente), con enlace a la ficha para restablecer.
 * Devuelve el correo de la persona para que quien llama le mande el aviso por correo después del COMMIT.
 */
export type EntradaBloqueo = {
  tenantId: string;
  personaId: string;
  userId: string;
  minutos: number;
  ipHmac: string | null;
  userAgent: string | null;
};

export type AvisoCorreoBloqueo = { correo: string; nombre: string; minutos: number } | null;

const ROLES_RRHH = ["owner", "admin", "gerente"] as const;

export async function registrarBloqueoPin(
  tx: TenantTx,
  e: EntradaBloqueo,
): Promise<AvisoCorreoBloqueo> {
  await registrarEventoSeguridad(
    {
      tipo: "seguridad.pin.bloqueo",
      userId: e.userId,
      tenantId: e.tenantId,
      detalle: { resultado: "bloqueado", minutos: e.minutos },
      ipHmac: e.ipHmac,
      userAgent: e.userAgent,
    },
    tx,
  );
  const [persona, usuario, rrhh] = await Promise.all([
    tx.persona.findUnique({
      where: { id: e.personaId },
      select: { nombres: true, apellidos: true },
    }),
    tx.user.findUnique({ where: { id: e.userId }, select: { email: true, name: true } }),
    tx.membership.findMany({
      where: { tenantId: e.tenantId, estado: "activa", rol: { in: [...ROLES_RRHH] } },
      select: { userId: true },
    }),
  ]);
  const nombre = persona ? `${persona.nombres} ${persona.apellidos}`.trim() : "Una persona";
  const filas = [
    {
      tenantId: e.tenantId,
      usuarioId: e.userId,
      titulo: "Tu ingreso con PIN quedó en pausa",
      cuerpo: `Hubo varios intentos fallidos y lo pausamos ${e.minutos} minutos. Si no fuiste tú, avisa a RR. HH.`,
    },
    ...[...new Set(rrhh.map((m) => m.userId))]
      .filter((id) => id !== e.userId)
      .map((usuarioId) => ({
        tenantId: e.tenantId,
        usuarioId,
        titulo: `PIN de terreno en pausa: ${nombre}`,
        cuerpo: `Se pausó ${e.minutos} minutos por intentos fallidos. Si no fue ella o él, restablece el PIN desde su ficha.`,
        enlace: `/personas/${e.personaId}/laboral`,
      })),
  ];
  await tx.notificacion.createMany({ data: filas });
  return usuario ? { correo: usuario.email, nombre: usuario.name, minutos: e.minutos } : null;
}
