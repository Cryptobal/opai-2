import { createHash } from "node:crypto";
import { prohibido } from "@opai/capabilities";

import type { Identidad } from "./actor";
import { tieneAccesoAPortal } from "./acceso-portal";
import { verificarMfaDe } from "./mfa";

const ordenadas = (valores: readonly string[]) => [...new Set(valores)].sort();

/** Solo datos de autorización; nombres, correos y orden de consultas no cambian el acceso. */
function huella(i: Identidad, portal: string | null): string {
  const m = i.actual;
  const canonico = JSON.stringify({
    usuario: i.usuario.id,
    portal,
    plataforma: i.usuario.platformRole,
    membresia: m?.id,
    tenant: m?.tenantId,
    estadoTenant: m?.tenant.estado,
    estado: m?.estado,
    rol: m?.rol,
    portales: ordenadas(m?.portales ?? []),
    permisos: i.acceso.permisosRol === null ? null : ordenadas(i.acceso.permisosRol),
    excepciones: i.acceso.excepciones.map((e) => JSON.stringify([e.permiso, e.conceder])).sort(),
    instalaciones: i.acceso.instalaciones === null ? null : ordenadas(i.acceso.instalaciones),
    modulos: ordenadas(i.modulosActivos),
    soloLectura: ordenadas(i.modulosSoloLectura ?? []),
    mfaActiva: i.mfaActiva,
    mfaVerificada: i.mfaVerificada === true,
  });
  return createHash("sha256").update(canonico).digest("hex");
}

/** Falla ante cambios reales; nunca sustituye el tenant ni el contexto transaccional del caller. */
export function crearRevalidacionAcceso(
  inicial: Identidad,
  portal: string | null,
  leerActual: () => Promise<Identidad | null>,
  verificarMfa: typeof verificarMfaDe = verificarMfaDe,
): () => Promise<string> {
  const esperada = huella(inicial, portal);
  const tenantId = inicial.actual?.tenantId;
  return async () => {
    const actual = await leerActual();
    if (
      !tenantId ||
      !actual ||
      actual.actual?.tenantId !== tenantId ||
      actual.actual.estado !== "activa" ||
      actual.actual.tenant.estado === "suspendido" ||
      (portal !== null && !tieneAccesoAPortal(actual, portal)) ||
      huella(actual, portal) !== esperada ||
      (await verificarMfa(actual))
    ) {
      throw prohibido("Tu acceso cambió durante la solicitud. Vuelve a abrir el agente.");
    }
    return esperada;
  };
}
