/** Tipos y errores de la cola local de Terreno (CAR-78 · E1). Ver `cola.ts`. */
export type HechoLocal = {
  clave: string;
  tipo: string;
  payload: unknown;
  personaId: string | null;
  horaHecho: string;
  creadoEn: number;
};

/** Lo que el servidor resolvió de un hecho que ya salió de la cola. */
export type ResultadoLocal = {
  clave: string;
  tipo: string;
  horaHecho: string;
  estado: "sincronizado" | "rechazado";
  /** Motivo del rechazo (`tipo_no_permitido`, `muy_antiguo`…); null si se sincronizó. */
  motivo: string | null;
  resueltoEn: number;
};

export type EstadoEnvio = {
  pendientes: number;
  intentoEn: number;
  ok?: boolean;
  error?: string;
  desfaseSegundos?: number;
  rechazados?: number;
};

export type ResumenCola = {
  pendientes: HechoLocal[];
  sincronizados: ResultadoLocal[];
  rechazados: ResultadoLocal[];
};

/** El tipo no se puede guardar en el teléfono para enviarlo después (exige sesión en línea o no está declarado). */
export class TipoNoEncolable extends Error {
  constructor(readonly tipo: string) {
    super(`El tipo «${tipo}» no se puede guardar sin conexión.`);
    this.name = "TipoNoEncolable";
  }
}

/** No se pudo comprobar que el hecho quedó guardado en el teléfono: no se debe mostrar éxito. */
export class PersistenciaNoVerificada extends Error {
  constructor() {
    super("No se pudo guardar en el teléfono. Inténtalo de nuevo.");
    this.name = "PersistenciaNoVerificada";
  }
}
