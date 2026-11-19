export type EtapaComprasQa =
  | "CONTEXTO"
  | "METADATA_RAMA"
  | "METADATA_ENDPOINTS"
  | "DESTINO"
  | "CONSTRUIR_CLIENTE"
  | "FIXTURE"
  | "CERRAR_CLIENTE";

class ErrorEtapaComprasQa extends Error {
  constructor(readonly etapa: EtapaComprasQa) {
    super(`Setup de compras abortado [${etapa}]. Sin reparación automática.`);
  }
}

/** No conserva cause/message del error original: podría contener URLs, SQL o credenciales. */
export async function enEtapaComprasQa<T>(
  etapa: EtapaComprasQa,
  accion: () => T | Promise<T>,
): Promise<T> {
  try {
    return await accion();
  } catch {
    throw new ErrorEtapaComprasQa(etapa);
  }
}

export function diagnosticoComprasQa(error: unknown): string {
  return error instanceof ErrorEtapaComprasQa
    ? error.message
    : "Setup de compras abortado [INICIO]. Sin reparación automática.";
}
