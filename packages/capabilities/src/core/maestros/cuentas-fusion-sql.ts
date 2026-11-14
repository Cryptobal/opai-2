// Pasos SQL de la fusión de cuentas (CAR-27, BRIEF-CAR-27-fusionar §4). $1::uuid = cuenta que queda,
// $2::uuid = duplicado. Corren dentro de `enTransaccion`: la RLS (FORCE) limita todo al tenant de la sesión.
// Los identificadores son constantes de este archivo; los ids van siempre como parámetros.

/**
 * Tablas con FK hacia `core.cuentas` que la fusión cubre (las mueve o, como `cuentas_referencias`,
 * que es append-only y legal, bloquea la fusión si el duplicado tiene filas). Una prueba las compara
 * con la base.
 */
export const FK_CUENTAS_MOVIDAS = [
  "comercial.negocios",
  "core.actividad_vinculos",
  "core.campo_valores",
  "core.contacto_cuentas",
  "core.contactos",
  "core.correos_cliente",
  "core.cuentas_referencias",
  "core.cuentas_representantes",
  "core.etiqueta_asignaciones",
  "core.instalaciones",
  "finanzas.cobranza_gestiones",
  "finanzas.documentos_emitidos",
  "finanzas.ventas_programaciones",
  "portal_cliente.accesos",
  "portal_cliente.config_cuentas",
] as const;

/** Vínculos «uno por entidad»: si la cuenta que queda ya lo tiene, se borra el del duplicado. */
const UNICOS: readonly [tabla: string, clave: string][] = [
  ["core.etiqueta_asignaciones", "etiqueta_id"],
  ["core.actividad_vinculos", "actividad_id"],
  ["core.campo_valores", "campo_id"],
];

/** Movimientos simples de `cuenta_id` (sin índices únicos que choquen). */
const SIMPLES = [
  "comercial.negocios",
  "comercial.solicitudes",
  "core.correos_cliente",
  "core.cuentas_representantes",
  "finanzas.cobranza_gestiones",
  "finanzas.documentos_emitidos",
  "finanzas.ventas_programaciones",
  "portal_cliente.accesos",
] as const;

const PRINCIPAL_EN_DESTINO =
  "EXISTS (SELECT 1 FROM core.contacto_cuentas k WHERE k.cuenta_id = $1::uuid AND k.es_principal)";

/** Sentencias en orden. Cada una recibe ($1::uuid = queda, $2::uuid = duplicado). */
export const PASOS_FUSION: readonly string[] = [
  // Contactos: si la que queda ya tiene principal, los del duplicado dejan de serlo (el trigger
  // `sincronizar_vinculo_cambio` copia `es_principal` del contacto a su vínculo al moverlo).
  `UPDATE core.contactos SET es_principal = false WHERE cuenta_id = $2::uuid AND es_principal AND ${PRINCIPAL_EN_DESTINO}`,
  `UPDATE core.contacto_cuentas SET es_principal = false WHERE cuenta_id = $2::uuid AND es_principal AND ${PRINCIPAL_EN_DESTINO}`,
  `DELETE FROM core.contacto_cuentas d WHERE d.cuenta_id = $2::uuid AND EXISTS (SELECT 1 FROM core.contacto_cuentas k WHERE k.cuenta_id = $1::uuid AND k.contacto_id = d.contacto_id)`,
  `UPDATE core.contacto_cuentas SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`,
  `UPDATE core.contactos SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`,
  ...UNICOS.flatMap(([t, c]) => [
    `DELETE FROM ${t} d WHERE d.cuenta_id = $2::uuid AND EXISTS (SELECT 1 FROM ${t} k WHERE k.cuenta_id = $1::uuid AND k.${c} = d.${c})`,
    `UPDATE ${t} SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`,
  ]),
  `DELETE FROM portal_cliente.config_cuentas WHERE cuenta_id = $2::uuid AND EXISTS (SELECT 1 FROM portal_cliente.config_cuentas k WHERE k.cuenta_id = $1::uuid)`,
  `UPDATE portal_cliente.config_cuentas SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`,
  `UPDATE core.instalaciones SET nombre = nombre || ' (fusionada)' WHERE cuenta_id = $2::uuid AND nombre IN (SELECT nombre FROM core.instalaciones WHERE cuenta_id = $1::uuid)`,
  `UPDATE core.instalaciones SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`,
  ...SIMPLES.map((t) => `UPDATE ${t} SET cuenta_id = $1::uuid WHERE cuenta_id = $2::uuid`),
  // Polimórficas: documentos y equivalencias con otros sistemas (1.0) pasan a la que queda.
  `DELETE FROM core.documento_vinculos d WHERE d.entidad_tipo = 'cuenta' AND d.entidad_id = $2::uuid AND EXISTS (SELECT 1 FROM core.documento_vinculos k WHERE k.entidad_tipo = 'cuenta' AND k.entidad_id = $1::uuid AND k.documento_id = d.documento_id)`,
  `UPDATE core.documento_vinculos SET entidad_id = $1::uuid WHERE entidad_tipo = 'cuenta' AND entidad_id = $2::uuid`,
  `UPDATE core.ids_externos SET entidad_id = $1::uuid WHERE entidad_tipo = 'cuenta' AND entidad_id = $2::uuid`,
];

/** Conteos del resumen («qué se mueve»), con la cuenta duplicada como $1::uuid. */
export const CONTEOS_FUSION = `SELECT
  (SELECT count(*) FROM core.contacto_cuentas WHERE cuenta_id = $1::uuid)::int AS contactos,
  (SELECT count(*) FROM core.instalaciones WHERE cuenta_id = $1::uuid)::int AS instalaciones,
  (SELECT count(*) FROM comercial.negocios WHERE cuenta_id = $1::uuid)::int AS negocios,
  (SELECT count(*) FROM core.documento_vinculos WHERE entidad_tipo = 'cuenta' AND entidad_id = $1::uuid)::int AS documentos,
  (SELECT count(*) FROM core.actividad_vinculos WHERE cuenta_id = $1::uuid)::int AS actividad,
  (SELECT count(*) FROM finanzas.documentos_emitidos WHERE cuenta_id = $1::uuid)::int AS facturas,
  (SELECT count(*) FROM core.cuentas_referencias WHERE cuenta_id = $1::uuid)::int AS referencias`;

/** Correos de contactos del duplicado que ya existen en la cuenta que queda ($1::uuid queda, $2::uuid duplicado). */
export const CORREOS_REPETIDOS = `SELECT d.email FROM core.contactos d
  WHERE d.cuenta_id = $2::uuid AND d.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM core.contactos k WHERE k.cuenta_id = $1::uuid AND k.email = d.email)
  LIMIT 5`;
