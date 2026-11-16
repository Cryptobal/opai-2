import { SeccionTarjeta } from "@opai/ds";

import { AjustesConectados } from "../_centro/ajustes-conectados";
import { cargarAjustes } from "../_centro/ajustes-datos";

const CLAVES = new Set([
  "comunicaciones_remitente",
  "notificaciones_correo_defecto",
  "notificaciones_correo_comercial",
  "notificaciones_correo_operaciones",
  "notificaciones_correo_finanzas",
]);

/** Ajustes de remitente y copias ocultas en avisos (no afectan correos al cliente). */
export async function TarjetaCopiasAvisos() {
  const ajustes = await cargarAjustes("core", "Comunicaciones");
  const campos = ajustes.campos.filter((c) => CLAVES.has(c.clave));
  return (
    <SeccionTarjeta titulo="Copias ocultas en avisos">
      <p className="t-caption mb-3 text-fg-muted">
        Solo en los avisos que configuras abajo. Los correos al cliente (propuestas, facturas) usan el
        correo comercial en Datos de la empresa.
      </p>
      <AjustesConectados campos={campos} valores={ajustes.valores} />
    </SeccionTarjeta>
  );
}