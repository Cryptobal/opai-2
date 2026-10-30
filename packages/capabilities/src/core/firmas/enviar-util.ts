import { z } from "zod";

import {
  enmascararRun,
  nivelAlMenos,
  nivelValido,
  ROLES_FIRMANTE,
  TIPOS_FIRMANTE,
  type ClaseFirma,
  type NivelFirma,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import type { VistaPolitica } from "./comun";
import { nuevoToken } from "./comun-flujo";
import type { SolicitudVista } from "./vistas";

export const firmanteInputSchema = z.object({
  tipo: z.enum(TIPOS_FIRMANTE),
  rol: z.enum(ROLES_FIRMANTE).default("firma"),
  personaId: uuidSchema.optional(),
  contactoId: uuidSchema.optional(),
  usuarioId: uuidSchema.optional(),
  nombre: z.string().trim().min(2).max(160),
  run: z.string().trim().max(12).nullable().optional(),
  email: z.email().nullable().optional(),
  telefono: z.string().trim().max(20).nullable().optional(),
});
export type FirmanteInput = z.infer<typeof firmanteInputSchema>;

/** Valida el nivel elegido contra la política (R2, R3): el envío sube, nunca baja; N3 apagada. */
export function validarNivelEnvio(clase: ClaseFirma, nivel: NivelFirma, pol: VistaPolitica): void {
  if (nivel === "N3") throw reglaDeNegocio("N3 (FEA) está apagada en esta versión (P2/P3).");
  if (!nivelValido(clase, nivel)) throw reglaDeNegocio(`El nivel ${nivel} no vale para esta clase.`);
  if (!nivelAlMenos(nivel, pol.nivelMinimo))
    throw reglaDeNegocio(`No se puede bajar del mínimo ${pol.nivelMinimo} de la política (R3).`);
  if (!pol.nivelesPermitidos.includes(nivel))
    throw reglaDeNegocio(`El nivel ${nivel} no está entre los permitidos por la política.`);
}

/** Al menos un firmante firma y cada firmante que firma tiene por dónde recibir el enlace (R12). */
export function validarFirmantes(firmantes: readonly FirmanteInput[]): void {
  if (!firmantes.some((f) => f.rol === "firma"))
    throw reglaDeNegocio("La solicitud necesita al menos un firmante con rol de firma.");
  for (const f of firmantes) {
    if (f.rol !== "copia" && f.tipo !== "usuario" && !f.email && !f.telefono)
      throw reglaDeNegocio(`"${f.nombre}" no tiene correo ni teléfono para recibir el enlace.`);
  }
}

type FilaFirmanteNueva = {
  tenantId: string;
  orden: number;
  rol: string;
  tipo: string;
  personaId: string | null;
  contactoId: string | null;
  usuarioId: string | null;
  nombre: string;
  run: string | null;
  email: string | null;
  telefono: string | null;
  tokenHash: string | null;
  tokenExpira: Date | null;
};

/** Filas de firmante con su enlace personal N1 (token hasheado) cuando no firman en sesión (R12). */
export function construirFirmantes(
  tenantId: string,
  firmantes: readonly FirmanteInput[],
  expira: Date,
): { row: FilaFirmanteNueva; token: string | null }[] {
  return firmantes.map((f, i) => {
    const conToken = f.rol !== "copia" && f.tipo !== "usuario";
    const t = conToken ? nuevoToken() : null;
    return {
      token: t?.token ?? null,
      row: {
        tenantId,
        orden: i,
        rol: f.rol,
        tipo: f.tipo,
        personaId: f.personaId ?? null,
        contactoId: f.contactoId ?? null,
        usuarioId: f.usuarioId ?? null,
        nombre: f.nombre,
        run: f.run ?? null,
        email: f.email ?? null,
        telefono: f.telefono ?? null,
        tokenHash: t?.hash ?? null,
        tokenExpira: t ? expira : null,
      },
    };
  });
}

type BasePreview = {
  documentoId: string;
  documentoVersion: number;
  sha256: string;
  clase: string;
  nivel: string;
  orden: string;
  mensaje: string | null;
  plazoVence: Date;
};

/** Vista previa del envío sin persistir: huella, firmantes y nivel (R4, CA5). */
export function vistaPreview(base: BasePreview, firmantes: readonly FirmanteInput[]): SolicitudVista {
  return {
    id: "",
    documentoId: base.documentoId,
    documentoVersion: base.documentoVersion,
    sha256: base.sha256,
    clase: base.clase,
    nivel: base.nivel,
    orden: base.orden,
    estado: "enviada",
    mensaje: base.mensaje,
    plazoVence: base.plazoVence.toISOString(),
    motivo: null,
    documentoFirmadoId: null,
    sha256Firmado: null,
    completadaEn: null,
    creadaEn: new Date().toISOString(),
    firmantes: firmantes.map((f, i) => ({
      id: "",
      orden: i,
      rol: f.rol,
      tipo: f.tipo,
      nombre: f.nombre,
      run: enmascararRun(f.run ?? null),
      estado: "pendiente",
      vistoEn: null,
      firmadoEn: null,
      motivoRechazo: null,
    })),
  };
}
