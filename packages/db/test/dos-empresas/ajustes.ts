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
  // Pauta (CAR-81): CHECK de tipo de excepción y de acción del historial.
  "pauta.excepciones": { valores: () => ({ tipo: "ausencia", estado: "activa" }) },
  "pauta.historial": { valores: () => ({ accion: "serie_fijada" }) },
  "pauta.registros_operativos": { valores: () => ({ tipo: "cobertura_confirmada", estado: "activa", motivo: "" }) },
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
  // CPQ (CAR-119): CHECK de tipo de línea (lineas_tipo_check).
  "cpq.lineas": { valores: () => ({ tipo: "item" }) },
  // CPQ (CAR-135): CHECK tipo/base; `copia` no debe regenerar `tipo` (índice único parcial por tenant+tipo).
  "cpq.plantillas_documento": {
    fijas: ["tipo", "base"],
    valores: () => ({ tipo: "cotizacion", base: "clasica", bloques_json: "[]" }),
  },
  "cpq.plantillas_documento_revisiones": {
    dependencias: ["cpq.plantillas_documento"],
    valores: (ctx) => ({
      plantilla_documento_id: id(ctx, "cpq.plantillas_documento"),
      base: "clasica",
      bloques_json: "[]",
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
  // Finanzas · Flujo de caja (CAR-91): sección válida y semanas en lunes (CHECK de cada tabla).
  "finanzas.flujo_filas": { valores: () => ({ seccion: "ingreso" }) },
  "finanzas.flujo_celdas": { valores: () => ({ semana: "2026-01-05", monto: 1 }) },
  "finanzas.flujo_cierres": { valores: () => ({ semana: "2026-01-05" }) },
  "finanzas.flujo_ajustes": { valores: () => ({ desde: "2026-01-05" }) },
  "finanzas.flujo_avisos_emitidos": { valores: () => ({ semana: "2026-01-05", saldo_proyectado: 0 }) },
  // Leads: canal y estado dentro de sus listas (CHECK *_canal_check y *_estado_check).
  "comercial.solicitudes": { valores: () => ({ canal: "manual", estado: "nueva" }) },
  "comercial.canales_solicitud": { valores: () => ({ canal: "manual", estado: "sin_conectar" }) },
  // Finanzas · Compras: vocabularios cerrados y total = suma de los montos (CHECK de la migración).
  "finanzas.cuentas_contables": { valores: () => ({ tipo: "activo", naturaleza: "deudora" }) },
  "finanzas.centros_costo": { valores: () => ({ tipo: "general" }) },
  "finanzas.documentos_recibidos": { valores: () => ({ tipo_dte: 33, monto_total: 0 }) },
  "finanzas.dte_config": { valores: () => ({ ambiente: "certificacion" }) },
  "finanzas.dte_folios": {
    valores: () => ({ tipo_dte: 33, folio_desde: 1, folio_hasta: 100, folio_actual: 1 }),
  },
  "finanzas.documentos_emitidos": {
    dependencias: ["core.cuentas"],
    valores: (ctx) => ({
      cuenta_id: id(ctx, "core.cuentas"),
      tipo_dte: 33,
      estado_dte: "borrador",
      estado_cobro: "pendiente",
    }),
  },
  "finanzas.documentos_emitidos_lineas": {
    dependencias: ["finanzas.documentos_emitidos"],
    valores: () => ({ glosa: "Servicio de prueba", monto: 1000 }),
  },
  "finanzas.documentos_emitidos_referencias": {
    dependencias: ["finanzas.documentos_emitidos"],
    valores: () => ({ tipo_dte_ref: 33, folio_ref: 1, codigo_ref: 1 }),
  },
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
