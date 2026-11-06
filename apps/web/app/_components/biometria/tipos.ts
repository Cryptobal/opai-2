/** Forma de lo que devuelven `asistencia.biometria.estado`, `mi_estado` y `consentimientos.textos`. */
export type EstadoBiometria = {
  rostroEnrolado: boolean;
  proveedor: string | null;
  enroladoEn: string | null;
  consentimientos: { tipo: "biometria_facial" | "telefono_personal"; vigente: boolean; version: string | null }[];
  telefonoPersonalHabilitado: boolean;
  yo: { personaId: string; instalacionId: string | null; instalacionNombre: string | null } | null;
};

export type TextoConsentimientoVista = { tipo: "biometria_facial" | "telefono_personal"; version: string; texto: string };

export const consentido = (e: EstadoBiometria, tipo: "biometria_facial" | "telefono_personal") =>
  e.consentimientos.some((c) => c.tipo === tipo && c.vigente);
