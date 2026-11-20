export type EtapaComprasQa =
  | "CONTEXTO"
  | "METADATA_RAMA"
  | "METADATA_ENDPOINTS"
  | "DESTINO"
  | "CONSTRUIR_CLIENTE"
  | "FIXTURE"
  | "FIXTURE_TX"
  | "FIXTURE_TENANT_CONSULTA"
  | "FIXTURE_TENANT_ESTADO"
  | "FIXTURE_TENANT_AUSENTE"
  | "FIXTURE_TENANT_SUSPENDIDO"
  | "FIXTURE_INTEGRIDAD"
  | "FIXTURE_INSERT_PROVEEDOR"
  | "FIXTURE_INSERT_CUENTA"
  | "FIXTURE_INSERT_DOCUMENTOS"
  | "FIXTURE_INSERT_MOVIMIENTO"
  | "FIXTURE_INSERT_CONCILIACION"
  | "CERRAR_CLIENTE";

class ErrorEtapaComprasQa extends Error {
  constructor(readonly etapa: EtapaComprasQa, falloCierre = false) {
    const cierre = falloCierre ? " También falló [CERRAR_CLIENTE]." : "";
    super(`Setup de compras abortado [${etapa}]. Sin reparación automática.${cierre}`);
  }
}

/** No conserva cause/message del error original: podría contener URLs, SQL o credenciales. */
export function enEtapaComprasQa<T>(
  etapa: EtapaComprasQa,
  accion: () => T | Promise<T>,
): Promise<T> {
  return Promise.resolve().then(accion).catch((error: unknown) => {
    // Solo el envoltorio privado ya sanitizado puede cruzar etapas.
    if (error instanceof ErrorEtapaComprasQa) throw error;
    throw new ErrorEtapaComprasQa(etapa);
  });
}

export function diagnosticoComprasQa(error: unknown): string {
  return error instanceof ErrorEtapaComprasQa
    ? error.message
    : "Setup de compras abortado [INICIO]. Sin reparación automática.";
}

export function agregarFalloCierreComprasQa(error: unknown): Error {
  return new ErrorEtapaComprasQa(error instanceof ErrorEtapaComprasQa ? error.etapa : "FIXTURE", true);
}
