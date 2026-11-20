// Arma los firmantes de una solicitud desde la plantilla y la ficha de la persona (CAR-633).
import { type ClaseFirma, type ClasePlantilla, type FirmantesPlantilla } from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import type { FirmanteInput } from "../firmas/enviar-util";

type PersonaFirma = {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  emailPersonal: string | null;
  emailLaboral: string | null;
  telefono: string | null;
};

export async function firmantesLaborales(
  ctx: Contexto,
  plantilla: { firmantes: FirmantesPlantilla },
  persona: PersonaFirma,
): Promise<FirmanteInput[]> {
  const nombre = `${persona.nombres} ${persona.apellidos}`.trim();
  const email = persona.emailPersonal ?? persona.emailLaboral;
  const telefono = persona.telefono;
  const quiereTrabajador = plantilla.firmantes === "trabajador" || plantilla.firmantes === "ambos";
  const quiereEmpleador = plantilla.firmantes === "empleador" || plantilla.firmantes === "ambos";
  const out: FirmanteInput[] = [];
  if (quiereTrabajador) {
    if (!email && !telefono)
      throw reglaDeNegocio(
        `${nombre} no tiene correo ni teléfono para recibir el enlace de firma. Complétalo en la ficha.`,
      );
    out.push({
      tipo: "trabajador",
      rol: "firma",
      nombre,
      run: persona.rut,
      email,
      telefono,
      personaId: persona.id,
    });
  }
  if (quiereEmpleador) {
    const fe = await ctx.db.firmanteEmpresa.findFirst({
      where: { tenantId: ctx.tenantId, activo: true },
    });
    if (!fe) throw reglaDeNegocio("Configura el firmante de la empresa en Configuración antes de enviar.");
    const usuario = await ctx.db.user.findFirst({ where: { id: fe.usuarioId }, select: { email: true } });
    out.push({
      tipo: "usuario",
      rol: "firma",
      nombre: fe.nombre,
      run: fe.run,
      email: usuario?.email ?? null,
      usuarioId: fe.usuarioId,
    });
  }
  return out;
}

/** Solo plantillas laborales sobre persona pueden enviarse en lote. */
export function claseFirmaDePlantilla(clase: ClasePlantilla): ClaseFirma {
  return clase as ClaseFirma;
}