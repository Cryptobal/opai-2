// @opai/auth (ADR-015). El resto del código solo usa estas funciones; la librería queda encapsulada.
export { bloqueoDeIngreso, mensajeBloqueo, puedeIniciarSesion } from "./acceso";
export { auth, type Auth } from "./auth";
export {
  googleHabilitado,
  LARGO_MINIMO_PASSWORD,
  passwordValida,
  reglasPassword,
  VIGENCIA_ENLACE_SEGUNDOS,
  VIGENCIA_RECUPERACION_SEGUNDOS,
} from "./opciones";
export { correoDeRecuperacion } from "./recuperacion";
export { getSession, requireSession, sesionDeRequest, type Sesion } from "./session";
export { crearUsuarioConPassword } from "./usuarios";
