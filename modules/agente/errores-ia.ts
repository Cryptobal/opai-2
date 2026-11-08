import { ErrorCapacidad, ErrorRespaldoIa } from "@opai/capabilities";
import { ErrorIa } from "@opai/integrations";

/** Mensajes propios: nunca se copia el cuerpo, proveedor, modelo ni mensaje de la excepción. */
function mensajeIa(error: ErrorIa): string {
  const estado = error.estado;
  if (estado === 401)
    return "El proveedor de IA rechazó la credencial. Pide a un administrador que revise Configuración → Integraciones.";
  if (estado === 403)
    return "El proveedor de IA denegó el acceso. Revisa los permisos de la credencial y el acceso al modelo en Configuración → Integraciones.";
  if (estado === 404)
    return "El recurso de IA solicitado no está disponible. Revisa el modelo y la configuración del proveedor en Configuración → Integraciones.";
  if (estado === 402)
    return "El proveedor de IA requiere revisar la facturación. Pide a un administrador que compruebe la cuenta del proveedor.";
  if (estado === 429)
    return "El proveedor de IA alcanzó un límite de uso. Espera antes de reintentar o pide a un administrador que revise la cuota del proveedor.";
  if (estado === null)
    return "No se pudo completar la comunicación con el proveedor de IA. Reintenta en unos minutos; si persiste, revisa la integración.";
  if (estado >= 500 && estado <= 599)
    return "El proveedor de IA no está disponible temporalmente. Reintenta en unos minutos.";
  return "El proveedor de IA rechazó la solicitud. Revisa el modelo y la configuración en Configuración → Integraciones; si persiste, contacta al administrador.";
}

/** Solo traduce errores tipados de IA; conserva permisos, presupuesto y errores inesperados. */
export async function conErroresIa<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    if (error instanceof ErrorIa) throw new ErrorCapacidad("UNPROCESSABLE", mensajeIa(error));
    if (error instanceof ErrorRespaldoIa)
      throw new ErrorCapacidad(
        "UNPROCESSABLE",
        error.causa
          ? mensajeIa(error.causa)
          : "La IA propia de tu empresa no está disponible. Pide a un administrador que revise la credencial y el modelo en Configuración → Integraciones.",
      );
    throw error;
  }
}
