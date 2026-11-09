/** Forma de lo que devuelve `asistencia.rostro.estado` (sin datos biométricos). */
export type EstadoAsistencia = {
  personaId: string;
  rostroEnrolado: boolean;
  consentimientoRostro: boolean;
  consentimientoTelefono: boolean;
  telefonoHabilitado: boolean;
  instalacionId: string | null;
  instalacionNombre: string | null;
};
