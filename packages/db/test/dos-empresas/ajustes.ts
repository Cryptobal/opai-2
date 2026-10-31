// Ajustes de la siembra genérica (CAR-48): solo para las tablas cuyo CHECK o trigger rechaza los
// valores genéricos. Cada entrada dice qué columnas fija y de qué tablas depende.
export type Contexto = {
  tenant: string;
  usuario: string;
  /** Filas ya sembradas de la misma empresa, por tabla (`core.cuentas`, …). */
  filas: Map<string, Record<string, unknown>>;
};

type Ajuste = {
  dependencias?: string[];
  valores: (ctx: Contexto) => Record<string, unknown>;
};

const id = (ctx: Contexto, tabla: string) => ctx.filas.get(tabla)?.["id"] ?? null;

export const AJUSTES: Record<string, Ajuste> = {
  // Pauta (CAR-81): CHECK de tipo de excepción y de acción del historial.
  "pauta.excepciones": { valores: () => ({ tipo: "ausencia", estado: "activa" }) },
  "pauta.historial": { valores: () => ({ accion: "serie_fijada" }) },
  "core.anexos_contrato": {
    valores: () => ({ motivo_cambio: "capa", generado_por_tipo: "usuario" }),
  },
  // Exactamente una identidad de agente: key o agente interno (CHECK *_identidad_agente).
  "core.aprobaciones": {
    dependencias: ["core.api_keys"],
    valores: (ctx) => ({ api_key_id: id(ctx, "core.api_keys") }),
  },
  "core.gasto_agente_mes": {
    dependencias: ["core.api_keys"],
    valores: (ctx) => ({ api_key_id: id(ctx, "core.api_keys") }),
  },
  // Nivel «cargo»: solo cargo_id y los montos completos (CHECK de nivel y de montos).
  "core.estructuras_sueldo": {
    dependencias: ["core.cargos"],
    valores: (ctx) => ({
      nivel: "cargo",
      cargo_id: id(ctx, "core.cargos"),
      sueldo_base: 1,
      colacion: 0,
      movilizacion: 0,
      gratificacion: "legal",
    }),
  },
  "core.retencion_ejecuciones": { valores: () => ({ modo: "simulacion", filas: 0 }) },
  // Fila con tenant_id: fuente "tenant", sin región (CHECK dias_calendario_coherencia_check).
  "core.dias_calendario": { valores: () => ({ fuente: "tenant", region: null }) },
  // Leads: canal y estado dentro de sus listas (CHECK *_canal_check y *_estado_check).
  "comercial.solicitudes": { valores: () => ({ canal: "manual", estado: "nueva" }) },
  "comercial.canales_solicitud": { valores: () => ({ canal: "manual", estado: "sin_conectar" }) },
};
