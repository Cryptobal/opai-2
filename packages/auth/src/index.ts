// @opai/auth (ADR-015). El resto del código solo usa estas funciones; la librería queda encapsulada.
// No hay cliente de navegador: el acceso va por Server Actions (ADR-037). Las reglas de contraseña
// que necesita la UI se importan desde `@opai/auth/opciones` (sin Better Auth).
export { bloqueoDeIngreso, mensajeBloqueo, puedeIniciarSesion } from "./acceso";
export {
  cambiarPassword,
  cerrarSesion,
  entrarConPassword,
  type FalloAcceso,
  pedirRecuperacion,
  restablecerPassword,
  type ResultadoAcceso,
  urlDeGoogle,
} from "./acciones";
export { auth, type Auth } from "./auth";
export { LOGIN_RETENCION_DIAS, purgarIntentosLogin } from "./bloqueo-login";
export {
  confirmarSegundoFactor,
  desactivarSegundoFactor,
  iniciarSegundoFactor,
  verificarCodigoRespaldo,
  verificarSegundoFactor,
} from "./mfa";
export {
  googleHabilitado,
  LARGO_MINIMO_PASSWORD,
  passwordValida,
  reglasPassword,
  VIGENCIA_ENLACE_SEGUNDOS,
  VIGENCIA_RECUPERACION_SEGUNDOS,
} from "./opciones";
export {
  entrarConPasskey,
  guardarPasskey,
  opcionesEntrarConPasskey,
  opcionesNuevaPasskey,
  type ResultadoPasskey,
} from "./passkey";
export {
  type Confirmacion,
  confirmarIdentidad,
  opcionesConfirmarConPasskey,
} from "./reautenticacion";
export { entrarConPin, type ResultadoPin } from "./pin";
export { correoDeRecuperacion } from "./recuperacion";
export { getSession, requireSession, sesionDeRequest, sesionVigente, type Sesion } from "./session";
export { crearUsuarioConPassword } from "./usuarios";
