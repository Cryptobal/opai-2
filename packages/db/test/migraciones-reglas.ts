// Reglas de forma de una migración nueva (CAR-47, docs/2.0/migraciones.md). Puras, sin base.

/** Migraciones nuevas desde aquí (exclusivo) deben seguir la plantilla. */
export const CORTE_PLANTILLA = "20261028230000";

/**
 * Migraciones anteriores a la plantilla: ya aplicadas en Neon, no se editan (CAR-47). La última es
 * la del PR #109, abierto al fijar el corte. Una migración ≤ corte que no esté aquí falla: el corte
 * no se esquiva con una fecha retroactiva.
 */
export const EXENTAS = new Set([
  "20261023031142_init",
  "20261023044757_identidad",
  "20261023160000_nucleo_maestros_servicios",
  "20261023170000_endurecimiento_nucleo",
  "20261023180000_idempotencia",
  "20261023190000_estructuras_por_concepto",
  "20261026120000_bloqueo_login",
  "20261026130000_bloqueo_login_por_conteo",
  "20261026140000_marcar_login_intento",
  "20261026150000_login_endurecer",
  "20261026160000_roles_permisos_finos",
  "20261027000000_cumplimiento_dpa_dpo",
  "20261027010000_dpa_texto_aceptado",
  "20261027050000_alcance_supervisor",
  "20261027060000_cumplimiento_consentimientos_arco",
  "20261027065000_roles_sabana",
  "20261027070000_cumplimiento_retencion",
  "20261028020000_rate_limit",
  "20261028030000_identidad_servicio",
  "20261028040000_puestos_posicion",
  "20261028040100_puestos_integridad",
  "20261028060000_mfa",
  "20261028070000_mfa_sesion",
  "20261028110000_portal_inicio",
  "20261028120000_agente_interno",
  "20261028130000_auditoria_encadenada",
  "20261028133000_auditoria_indice_concurrente",
  "20261028140000_auditoria_obligatoria",
  "20261028163000_auditoria_append",
  "20261028170000_force_rls",
  "20261028180000_capa_instalacion_sueldo",
  "20261028190000_vinculo_instalacion_jornada",
  "20261028200000_anexo_contrato_borrador",
  "20261028210000_comercial_negocios",
  "20261028220000_timeouts_opai_app",
  "20261028230000_plataforma_aprobaciones_auditoria",
]);

/**
 * Marca de las migraciones que no pueden ir en transacción (p. ej. CREATE INDEX CONCURRENTLY), con
 * su motivo en la misma línea.
 */
const SIN_TRANSACCION = /^--[ \t]*opai:sin-transaccion:[ \t]*\S[^\n]{9,}/m;
const REVERSION = /^--[ \t]*Reversión:[ \t]*\S/m;

/**
 * Comentarios, bloques `$etiqueta$ … $etiqueta$` y literales en una sola pasada, en orden de
 * aparición: así un `$$` dentro de un comentario no esconde sentencias, ni un `--` dentro de un
 * bloque DO. Los comentarios se borran, los bloques quedan como `$$` y los literales se conservan.
 */
const TOKENS =
  /--[^\n]*|\/\*[\s\S]*?\*\/|\$([A-Za-z_][A-Za-z_0-9]*)?\$[\s\S]*?\$\1\$|'(?:[^']|'')*'/g;

/** Sentencias SQL sin comentarios, en mayúsculas y con espacios normalizados (basta para la forma). */
function sentencias(sql: string): string[] {
  return sql
    .replace(TOKENS, (t) =>
      t.startsWith("--") || t.startsWith("/*") ? " " : t.startsWith("$") ? "$$" : t,
    )
    .split(";")
    .map((x) => x.replace(/\s+/g, " ").trim().toUpperCase())
    .filter(Boolean);
}

const LOCK = /^SET LOCAL LOCK_TIMEOUT\s*(=|TO)\s*'\d+(MS|S)'$/;
const ABRE = /^(BEGIN|START TRANSACTION)( TRANSACTION| WORK)?$/;
const CONTROL = /^(BEGIN|START TRANSACTION|COMMIT|END|ROLLBACK|ABORT)\b/;

/** Problemas de forma de una migración nueva; vacío si cumple la plantilla. */
export function problemasDeMigracion(original: string): string[] {
  const sql = original.normalize("NFC");
  const problemas: string[] = [];
  if (!REVERSION.test(sql)) problemas.push("falta la sección «-- Reversión: …» con su contenido");
  const s = sentencias(sql);
  if (SIN_TRANSACCION.test(sql)) {
    // Postgres envuelve un envío de varias sentencias en una transacción implícita, así que
    // CONCURRENTLY solo corre si es la única sentencia. El lock_timeout lo fija quien aplica
    // (PGOPTIONS, OPERACION-agentes.md A.5).
    if (s.length !== 1) problemas.push("marcada sin transacción: debe traer una sola sentencia");
    if (s.some((x) => CONTROL.test(x)))
      problemas.push("marcada sin transacción, pero trae BEGIN o COMMIT");
    return problemas;
  }
  if (!s[0] || !ABRE.test(s[0])) problemas.push("la primera sentencia debe ser BEGIN");
  if (!s[1] || !LOCK.test(s[1])) {
    problemas.push("la segunda sentencia debe ser «SET LOCAL lock_timeout = '…'»");
  }
  if (s.at(-1) !== "COMMIT") problemas.push("la última sentencia debe ser COMMIT");
  if (s.slice(1, -1).some((x) => CONTROL.test(x))) {
    problemas.push("solo una transacción: BEGIN al inicio y COMMIT al final");
  }
  if (s.some((x) => /^SET (SESSION )?LOCK_TIMEOUT/.test(x))) {
    problemas.push("«SET lock_timeout» de sesión: usa SET LOCAL dentro de la transacción");
  }
  return problemas;
}
