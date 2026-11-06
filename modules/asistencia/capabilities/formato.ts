import type { Contexto } from "@opai/capabilities";

export const ETIQUETA_TIPO: Record<string, string> = {
  entrada: "Entrada", salida: "Salida", inicio_colacion: "Inicio de colación", fin_colacion: "Fin de colación",
};
export const ETIQUETA_METODO: Record<string, string> = {
  rostro: "Reconocimiento facial", rut_pin: "RUT y PIN", pin_respaldo: "PIN de respaldo",
  manual_contingencia: "Registro por contingencia",
};

/** Fecha y hora en la zona de la empresa, con segundos (el comprobante lleva la hora del servidor). */
export function fechaHora(d: Date, zona: string): string {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "medium", hourCycle: "h23", timeZone: zona }).format(d);
}

export async function tenantBasico(ctx: Contexto) {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true, nombre: true, timezone: true } });
  return { slug: t?.slug ?? "", nombre: t?.nombre ?? "", zona: t?.timezone ?? "America/Santiago" };
}

export const nombreCompleto = (p: { nombres: string; apellidos: string }) => `${p.nombres} ${p.apellidos}`.trim();
