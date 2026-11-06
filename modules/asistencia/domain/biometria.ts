// Reglas puras de la identificación facial (CAR-89, D-02, D-03, Res. Ex. 38 art. 57). Sin proveedor ni
// base de datos: decide con los resultados que le entrega el adaptador.

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

export const TIPOS_CONSENTIMIENTO = ["biometria_facial", "telefono_personal"] as const;
export type TipoConsentimiento = (typeof TIPOS_CONSENTIMIENTO)[number];

/** Versión vigente de cada texto de consentimiento; subirla obliga a aceptar de nuevo. */
export const VERSION_CONSENTIMIENTO: Record<TipoConsentimiento, string> = {
  biometria_facial: "biometria-2026-11-v1",
  telefono_personal: "telefono-2026-11-v1",
};

export const TEXTO_CONSENTIMIENTO: Record<TipoConsentimiento, string> = {
  biometria_facial:
    "Autorizo expresamente el tratamiento de mi rostro, como dato biométrico sensible, con la única finalidad de verificar mi identidad al registrar mi asistencia. La empresa no podrá cederlo a terceros ni usarlo para otro fin. Puedo revocar este consentimiento cuando quiera, sin que ello afecte mi derecho a marcar: seguiré marcando con mi RUT y PIN. Al revocar, o al terminar mi relación laboral, mis datos biométricos se destruyen.",
  telefono_personal:
    "Acepto marcar mi asistencia desde mi teléfono personal. Sé que la empresa asume el costo del uso del teléfono para este fin, que no es obligatorio y que puedo volver a marcar en el kiosco de mi instalación cuando quiera.",
};

/** Umbral de similitud por defecto y sus límites: lo fija la plataforma, no cada empresa (T-03). */
export const UMBRAL_SIMILITUD_DEFECTO = 0.95;
export const UMBRAL_SIMILITUD_MIN = 0.8;
export const UMBRAL_SIMILITUD_MAX = 0.999;

export type DecisionRostro =
  | { ok: true; similitud: number }
  | { ok: false; motivo: Extract<MotivoRespaldo, "rostro_no_coincide" | "vida_fallida"> };

/**
 * Un rostro solo vale si la prueba de vida pasó (D-03, obligatoria) Y la similitud contra el rostro de la
 * persona alcanza el umbral. Sin vida no se compara: no hay nada que comparar.
 */
export function decidirRostro(v: { viva: boolean; coincide: boolean; similitud: number }, umbral: number): DecisionRostro {
  if (!v.viva) return { ok: false, motivo: "vida_fallida" };
  if (!v.coincide || v.similitud < umbral) return { ok: false, motivo: "rostro_no_coincide" };
  return { ok: true, similitud: v.similitud };
}

/** El umbral viene de un ajuste; un valor fuera de rango cae al defecto en vez de abrir o cerrar todo. */
export const umbralSeguro = (valor: number | null | undefined): number =>
  typeof valor === "number" && valor >= UMBRAL_SIMILITUD_MIN && valor <= UMBRAL_SIMILITUD_MAX ? valor : UMBRAL_SIMILITUD_DEFECTO;

export type Consentimiento = { tipo: TipoConsentimiento; version: string; aceptadoEn: Date; revocadoEn: Date | null };

/** ¿Hay un consentimiento vigente (aceptado, no revocado y de la versión actual)? */
export function consentimientoVigente(cs: readonly Consentimiento[], tipo: TipoConsentimiento): boolean {
  return cs.some((c) => c.tipo === tipo && c.revocadoEn === null && c.version === VERSION_CONSENTIMIENTO[tipo]);
}

export type RequisitosEnrolamiento = { consentimiento: boolean; correoPersonal: boolean; vinculoVigente: boolean };

/** Lo que falta para enrolar, en lenguaje de negocio (vacío = puede enrolarse). */
export function faltantesEnrolamiento(r: RequisitosEnrolamiento): string[] {
  const f: string[] = [];
  if (!r.vinculoVigente) f.push("La persona no tiene un vínculo laboral vigente.");
  if (!r.consentimiento) f.push("Falta el consentimiento vigente para el uso de su rostro.");
  if (!r.correoPersonal) f.push("Falta el correo personal de la persona.");
  return f;
}

/** Al caer a PIN se exige un motivo conocido; sin él, la marca se rechaza (P-08 de la spec, trazabilidad). */
export const motivoRespaldoValido = (m: string | undefined | null): m is MotivoRespaldo =>
  typeof m === "string" && (MOTIVOS_RESPALDO as readonly string[]).includes(m);

/** Persona cuya biometría hay que destruir: vínculo terminado y ningún otro vigente. */
export const debeSuprimirse = (vinculos: readonly { estado: string }[]): boolean =>
  vinculos.length > 0 && vinculos.every((v) => v.estado !== "vigente");
