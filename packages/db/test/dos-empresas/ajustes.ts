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
  /** Columnas que el trigger de la tabla rellena: no van en INSERT ni en copias. */
  omitir?: string[];
  valores: (ctx: Contexto) => Record<string, unknown>;
};

const id = (ctx: Contexto, tabla: string) => ctx.filas.get(tabla)?.["id"] ?? null;

export const AJUSTES: Record<string, Ajuste> = {
  // Comercial · seguimiento (CAR-67): CHECK de disparador, canal y ejecutor.
  "comercial.seguimiento_planes": { valores: () => ({ nombre: "Plan de prueba", disparador: "manual" }) },
  "comercial.seguimiento_plan_versiones": {
    valores: () => ({
      config: JSON.stringify({
        conteo: "habiles", desde: "inicio", hora: "09:00", ventana: { desde: "09:00", hasta: "18:00" },
        alResponder: "pausar", alTerminar: "solo_avisar", pasos: [],
      }),
    }),
  },
  "comercial.seguimiento_pasos": { valores: () => ({ canal: "interno", ejecutor: "persona" }) },
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
  // Finanzas · programación recurrente (CAR-25): cuenta o RUT del receptor, y un precio por línea
  // que coincide con la moneda (CLP por defecto).
  "finanzas.ventas_programaciones": {
    dependencias: ["core.cuentas"],
    valores: (ctx) => ({ cuenta_id: id(ctx, "core.cuentas"), tipo_dte: 33, dia_generacion: 1, moneda: "CLP", frecuencia: "mensual", plazo_pago_dias: 30 }),
  },
  "finanzas.ventas_programaciones_destinatarios": {
    dependencias: ["finanzas.ventas_programaciones", "core.contactos"],
    valores: (ctx) => ({
      programacion_id: id(ctx, "finanzas.ventas_programaciones"),
      contacto_id: id(ctx, "core.contactos"),
    }),
  },
  "finanzas.ventas_programaciones_lineas": {
    dependencias: ["finanzas.ventas_programaciones"],
    valores: () => ({ precio_unitario_clp: 1, precio_unitario_uf: null }),
  },
  // Finanzas · envío del documento al cliente (CAR-155): CHECK de estado (enviado | fallido).
  "finanzas.documentos_emitidos_envios": { valores: () => ({ estado: "enviado" }) },
  // Finanzas · cobranza (CAR-166): CHECKs de canal, origen y resultado.
  "finanzas.cobranza_gestiones": {
    dependencias: ["finanzas.documentos_emitidos", "core.cuentas"],
    valores: (ctx) => ({
      documento_id: id(ctx, "finanzas.documentos_emitidos"),
      cuenta_id: id(ctx, "core.cuentas"),
      canal: "correo",
      origen: "manual",
      resultado: "enviado",
      paso: null,
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
  // CPQ (CAR-144): vocabularios cerrados en biblioteca, propuesta y envío.
  "cpq.biblioteca_bloques": {
    valores: () => ({
      clave: "bloque-prueba",
      tipo: "texto_libre",
      titulo: "Bloque prueba",
      estado: "borrador",
      contenido_json: "{}",
    }),
  },
  "cpq.biblioteca_bloque_revisiones": {
    dependencias: ["cpq.biblioteca_bloques"],
    valores: (ctx) => ({
      bloque_id: id(ctx, "cpq.biblioteca_bloques"),
      version: 1,
      contenido_json: "{}",
    }),
  },
  "cpq.cotizaciones": {
    dependencias: ["comercial.negocios"],
    valores: (ctx) => ({
      negocio_id: id(ctx, "comercial.negocios"),
      codigo: "CPQ-TEST-001",
      titulo: "Cotización prueba dos empresas",
    }),
  },
  "cpq.versiones": {
    dependencias: ["cpq.cotizaciones"],
    valores: (ctx) => ({
      cotizacion_id: id(ctx, "cpq.cotizaciones"),
      numero: 1,
    }),
  },
  "cpq.propuestas_tecnicas": {
    dependencias: ["cpq.cotizaciones", "cpq.versiones"],
    valores: (ctx) => ({
      cotizacion_id: id(ctx, "cpq.cotizaciones"),
      version_id: id(ctx, "cpq.versiones"),
      base: "clasica",
      estado: "borrador",
      bloques_json: "[]",
    }),
  },
  "cpq.propuesta_envios": {
    dependencias: ["cpq.cotizaciones", "cpq.versiones"],
    valores: (ctx) => ({
      cotizacion_id: id(ctx, "cpq.cotizaciones"),
      version_id: id(ctx, "cpq.versiones"),
      estado: "pendiente_aprobacion",
      destinatarios_json: '[{"email":"envio@test.qa"}]',
      snapshot_json: "{}",
    }),
  },
  // Enlace público (CPQ v4): el CHECK pide un token de 32 hex; el uuid de la empresa sin guiones lo es.
  "cpq.enlaces_compartidos": {
    dependencias: ["cpq.cotizaciones", "cpq.versiones"],
    fijas: ["token"],
    valores: (ctx) => ({
      cotizacion_id: id(ctx, "cpq.cotizaciones"),
      version_id: id(ctx, "cpq.versiones"),
      token: ctx.tenant.replaceAll("-", ""),
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
  "finanzas.dte_config": { valores: () => ({ ambiente: "certificacion", emision_proveedor: "simulado" }) },
  "finanzas.dte_envios": {
    dependencias: ["finanzas.documentos_emitidos"],
    valores: () => ({ track_id: "SIM-1", estado: "pendiente", intentos: 0, max_intentos: 7 }),
  },
  "finanzas.cesiones": {
    dependencias: ["finanzas.documentos_emitidos"],
    valores: () => ({
      factor_rut: "76000000-0",
      anticipo: 1000,
      merma: 0,
      saldo_factor: 0,
      estado: "simulada",
      proveedor: "octava",
    }),
  },
  "finanzas.dte_folios": {
    omitir: ["folio_rango"],
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
  "finanzas.cuentas_bancarias": { valores: () => ({ banco: "Banco Sintético", numero_visible: "00012345678" }) },
  "finanzas.cartolas_importadas": {
    dependencias: ["finanzas.cuentas_bancarias"],
    valores: (ctx) => ({
      cuenta_id: id(ctx, "finanzas.cuentas_bancarias"),
      formato: "generico",
      saldo_final: 0,
      idempotency_key: "test-cartola",
    }),
  },
  "finanzas.movimientos_bancarios": {
    dependencias: ["finanzas.cuentas_bancarias"],
    valores: (ctx) => ({
      cuenta_id: id(ctx, "finanzas.cuentas_bancarias"),
      fecha: "2026-01-05",
      monto: 1000,
      glosa: "Abono prueba",
      clave_dedupe: "2026-01-05|1000|ABONO PRUEBA|",
      estado: "pendiente",
      origen: "cartola",
    }),
  },
  "finanzas.conciliaciones": {
    dependencias: ["finanzas.movimientos_bancarios", "finanzas.flujo_filas"],
    valores: (ctx) => ({
      movimiento_id: id(ctx, "finanzas.movimientos_bancarios"),
      tipo_enlace: "flujo_fila",
      enlace_id: id(ctx, "finanzas.flujo_filas"),
      monto: 1000,
    }),
  },
  "finanzas.reglas_conciliacion": { valores: () => ({ nombre: "Regla prueba", condiciones: {} }) },
  "finanzas.banco_avisos_emitidos": {
    dependencias: ["finanzas.cuentas_bancarias"],
    valores: (ctx) => ({ cuenta_id: id(ctx, "finanzas.cuentas_bancarias"), dia: "2026-01-05", saldo: 0 }),
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
  // CAR-157: vocabularios cerrados en corrida y fila de registro.
  "core.importaciones": {
    valores: () => ({
      sistema: "opai1",
      origen: "fixtures",
      version_contrato: "opai1-export/v1",
      modo: "simular",
      estado: "completada",
      conteos: "{}",
    }),
  },
  "core.importaciones_filas": {
    dependencias: ["core.importaciones"],
    valores: (ctx) => ({
      importacion_id: id(ctx, "core.importaciones"),
      entidad: "cuenta",
      id_1_0: "acc-prueba-dos-empresas",
      accion: "omitido",
    }),
  },
  "core.valores_tenant": {
    valores: () => ({
      indicador_id: "a1000001-0001-4001-8001-000000000001",
      valor_json: 4123701,
      vigente_desde: "2026-01-01",
      estado: "propuesto",
      origen: "sigue_fuente",
    }),
  },
};
