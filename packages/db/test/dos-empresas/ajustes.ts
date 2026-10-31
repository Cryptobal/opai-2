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
  /** La fila ya existe (la crea un trigger): la siembra la lee con estas columnas en vez de insertarla. */
  existente?: (ctx: Contexto) => Record<string, unknown>;
  /** Columnas de un índice único que `copia` no debe regenerar (tienen un CHECK de rango). */
  fijas?: string[];
  valores: (ctx: Contexto) => Record<string, unknown>;
};

const id = (ctx: Contexto, tabla: string) => ctx.filas.get(tabla)?.["id"] ?? null;

export const AJUSTES: Record<string, Ajuste> = {
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
  // Nómina (Brief 25): los CHECK de unidad por tipo y de tipo/estado rechazan el texto genérico.
  "nomina.novedades": { valores: () => ({ tipo: "ausencia", cantidad: 1, monto_clp: null }) },
  "nomina.conceptos": { valores: () => ({ tipo: "haber" }) },
  "nomina.periodos": { fijas: ["mes"], valores: () => ({ mes: 1 }) },
  "nomina.obligaciones": { fijas: ["mes", "tipo"], valores: () => ({ tipo: "lre", mes: 1 }) },
  // Leads: canal y estado dentro de sus listas (CHECK *_canal_check y *_estado_check).
  "comercial.solicitudes": { valores: () => ({ canal: "manual", estado: "nueva" }) },
  "comercial.canales_solicitud": { valores: () => ({ canal: "manual", estado: "sin_conectar" }) },
  // CRM PR 2a: el trigger de core.contactos crea el vínculo inicial contacto–cuenta.
  "core.contacto_cuentas": {
    dependencias: ["core.contactos", "core.cuentas"],
    existente: (ctx) => ({
      contacto_id: id(ctx, "core.contactos"),
      cuenta_id: id(ctx, "core.cuentas"),
    }),
    valores: () => ({}),
  },
  // Actividad: tipo dentro de su lista. Vínculos y asignaciones: exactamente una entidad (CHECK).
  "core.actividades": { valores: () => ({ tipo: "nota" }) },
  "core.actividad_vinculos": {
    dependencias: ["core.actividades", "core.cuentas"],
    valores: (ctx) => ({ cuenta_id: id(ctx, "core.cuentas") }),
  },
  "core.etiqueta_asignaciones": {
    dependencias: ["core.etiquetas", "core.cuentas"],
    valores: (ctx) => ({ cuenta_id: id(ctx, "core.cuentas") }),
  },
};
