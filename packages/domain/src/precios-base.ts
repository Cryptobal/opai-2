// Precios base de los recursos con costo (ADR-031): la plataforma los copia a cada tenant.

export type PrecioBase = { recurso: string; unidad: string; costoUnitarioMicro: number };

/**
 * Lista de precios de plataforma en micro-USD por unidad (1 USD = 1.000.000), referencial al
 * 23-oct-2026. La fija OPAI en Plataforma → Ajustes; el medidor la usa para costear consumos.
 */
export const PRECIOS_RECURSOS_BASE: readonly PrecioBase[] = [
  { recurso: "capacidad.ejecucion", unidad: "llamada", costoUnitarioMicro: 0 },
  { recurso: "ia.economica.entrada", unidad: "token", costoUnitarioMicro: 1 },
  { recurso: "ia.economica.salida", unidad: "token", costoUnitarioMicro: 5 },
  { recurso: "ia.estandar.entrada", unidad: "token", costoUnitarioMicro: 3 },
  { recurso: "ia.estandar.salida", unidad: "token", costoUnitarioMicro: 15 },
  { recurso: "ia.potente.entrada", unidad: "token", costoUnitarioMicro: 15 },
  { recurso: "ia.potente.salida", unidad: "token", costoUnitarioMicro: 75 },
  { recurso: "geo.autocompletado", unidad: "consulta", costoUnitarioMicro: 2_830 },
  { recurso: "geo.geocodificacion", unidad: "consulta", costoUnitarioMicro: 5_000 },
  { recurso: "geo.mapa", unidad: "imagen", costoUnitarioMicro: 2_000 },
  // Routes API · Compute Routes Basic, US$ 5 por mil (CAR-194, kilometraje).
  { recurso: "geo.ruta", unidad: "consulta", costoUnitarioMicro: 5_000 },
  // Biometría facial (CAR-89 · B4): AWS Rekognition, tarifas públicas referenciales (Face Liveness
  // US$ 0,015 por sesión; IndexFaces y SearchFacesByImage US$ 0,001 por imagen).
  { recurso: "biometria.vida", unidad: "sesion", costoUnitarioMicro: 15_000 },
  { recurso: "biometria.enrolar", unidad: "operacion", costoUnitarioMicro: 1_000 },
  { recurso: "biometria.verificar", unidad: "operacion", costoUnitarioMicro: 1_000 },
  { recurso: "correo.enviado", unidad: "correo", costoUnitarioMicro: 400 },
  { recurso: "almacenamiento.subida", unidad: "mb", costoUnitarioMicro: 15 },
  { recurso: "almacenamiento.descarga", unidad: "url", costoUnitarioMicro: 0 },
];
