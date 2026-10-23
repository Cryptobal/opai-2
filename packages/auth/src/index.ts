// @opai/auth (ADR-015). El resto del código solo usa estas funciones; la librería queda encapsulada.
export { puedeIniciarSesion } from "./acceso";
export { auth, type Auth } from "./auth";
export { googleHabilitado, LARGO_MINIMO_PASSWORD, VIGENCIA_ENLACE_SEGUNDOS } from "./opciones";
export { getSession, requireSession, sesionDeRequest, type Sesion } from "./session";
export { crearUsuarioConPassword } from "./usuarios";
