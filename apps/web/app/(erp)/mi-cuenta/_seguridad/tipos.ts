/** Salida de `core.metodos_acceso.list` (CAR-286): solo metadatos, sin secretos. */
export type PasskeyFila = {
  id: string;
  nombre: string | null;
  creadaEn: string | null;
  sincronizada: boolean;
};

export type Metodos = {
  appAutenticadora: boolean;
  passkeys: PasskeyFila[];
  tieneContrasena: boolean;
  conSegundoFactor: boolean;
  segundoFactorObligatorio: boolean;
};

/** Cuántos segundos factores quedan si se quita uno. */
export const restantesAlQuitar = (m: Metodos) =>
  (m.appAutenticadora ? 1 : 0) + m.passkeys.length - 1;

export const AVISO_SOLO_PASSWORD =
  "Si alguien obtiene tu contraseña podrá entrar a tu cuenta y ver los datos de tu empresa. Te recomendamos mantener al menos una passkey o la app autenticadora.";
