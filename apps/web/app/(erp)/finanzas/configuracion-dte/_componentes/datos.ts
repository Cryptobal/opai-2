import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { ConfigDte } from "./tipos";

const PERMISO = "finanzas:ventas.configure";

export async function cargarConfigDte() {
  const identidad = await requerirIdentidad("/finanzas/configuracion-dte");
  const puede = puedeDeIdentidad(identidad);
  const acceso = puede(PERMISO);
  const cfg = acceso
    ? await ejecutarComoUsuario<ConfigDte>("erp", "finanzas.dte_config.obtener", {})
    : null;
  return {
    state: acceso
      ? estadoPantalla(cfg ?? { ok: false, error: { code: "INTERNAL" } })
      : ("forbidden" as const),
    cfg: cfg?.ok ? cfg.data : null,
    acceso,
    esOwner: identidad.actual?.rol === "owner",
  };
}
