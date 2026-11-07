// Reglas puras de la identificación facial (CAR-89, D-02, D-03, Res. Ex. 38 art. 57). El adaptador, el
// enrolamiento y el consentimiento viven en el núcleo (B4, ADR-079); aquí solo lo propio de Asistencia.

export const MOTIVOS_RESPALDO = [
  "rostro_no_coincide",
  "vida_fallida",
  "proveedor_caido",
  "sin_enrolamiento",
  "sin_camara",
  "biometria_revocada",
  "otro",
] as const;
export type MotivoRespaldo = (typeof MOTIVOS_RESPALDO)[number];

/** Al caer a PIN se exige un motivo conocido; sin él, la marca se rechaza (trazabilidad). */
export const motivoRespaldoValido = (m: string | undefined | null): m is MotivoRespaldo =>
  typeof m === "string" && (MOTIVOS_RESPALDO as readonly string[]).includes(m);

/** Finalidades de consentimiento de Cumplimiento que usa Asistencia (L-13, T-04). */
export const PROPOSITO_TELEFONO = "telefono_personal_asistencia";
export const VERSION_AVISO = "asistencia-2026-11-v1";

export const TEXTO_CONSENTIMIENTO = {
  biometria_asistencia:
    "Autorizo expresamente el tratamiento de mi rostro, como dato biométrico sensible, con la única finalidad de verificar mi identidad al registrar mi asistencia. La empresa no podrá cederlo a terceros ni usarlo para otro fin. Puedo revocar este consentimiento cuando quiera, sin que ello afecte mi derecho a marcar: seguiré marcando con mi RUT y PIN. Al revocar, o al terminar mi relación laboral, mis datos biométricos se destruyen.",
  [PROPOSITO_TELEFONO]:
    "Acepto marcar mi asistencia desde mi teléfono personal. Sé que la empresa asume el costo del uso del teléfono para este fin, que no es obligatorio y que puedo volver a marcar en el kiosco de mi instalación cuando quiera.",
} as const;
export type PropositoConsentimiento = keyof typeof TEXTO_CONSENTIMIENTO;
export const PROPOSITOS = Object.keys(TEXTO_CONSENTIMIENTO) as PropositoConsentimiento[];

/** Persona cuya biometría hay que destruir: vínculo terminado y ningún otro vigente. */
export const debeSuprimirse = (vinculos: readonly { estado: string }[]): boolean =>
  vinculos.length > 0 && vinculos.every((v) => v.estado !== "vigente");
