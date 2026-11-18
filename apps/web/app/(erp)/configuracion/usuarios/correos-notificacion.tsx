import { SeccionTarjeta } from "@opai/ds";

import { AjustesConectados } from "../_centro/ajustes-conectados";
import { cargarAjustes } from "../_centro/ajustes-datos";

const CLAVES = new Set([
  "notificaciones_correo_defecto",
  "notificaciones_correo_comercial",
  "notificaciones_correo_operaciones",
  "notificaciones_correo_finanzas",
]);

/** Correos en copia oculta de los avisos por correo (no afectan correos al cliente). */
export async function TarjetaCorreosNotificacion() {
  const ajustes = await cargarAjustes("core", "Correos de notificación");
  const campos = ajustes.campos.filter((c) => CLAVES.has(c.clave));
  if (!campos.length) return null;
  return (
    <SeccionTarjeta titulo="Correos de notificación">
      <p className="t-caption mb-3 text-fg-muted">
        Copias ocultas en los avisos que configuras en Comunicaciones. El correo comercial del perfil
        de la empresa sigue usándose en propuestas y documentos al cliente.
      </p>
      <AjustesConectados campos={campos} valores={ajustes.valores} />
    </SeccionTarjeta>
  );
}