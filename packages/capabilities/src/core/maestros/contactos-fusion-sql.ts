// Pasos SQL de la fusión de contactos (CAR-27, F3). $1 = contacto que queda, $2 = duplicado.
// Corren dentro de `enTransaccion` (RLS FORCE por tenant); identificadores constantes, ids como parámetros.

/** Tablas con FK hacia `core.contactos` que la fusión mueve. Una prueba las compara con la base. */
export const FK_CONTACTOS_MOVIDAS = [
  "comercial.negocio_contactos",
  "core.actividad_vinculos",
  "core.campo_valores",
  "core.contacto_cuentas",
  "core.correos_cliente",
  "core.etiqueta_asignaciones",
  "core_firma.firmantes",
  "finanzas.ventas_programaciones_destinatarios",
  "portal_cliente.accesos",
] as const;

/** Vínculos «uno por entidad»: si el que queda ya lo tiene, se borra el del duplicado. */
const UNICOS: readonly [tabla: string, clave: string][] = [
  ["core.contacto_cuentas", "cuenta_id"],
  ["core.etiqueta_asignaciones", "etiqueta_id"],
  ["core.actividad_vinculos", "actividad_id"],
  ["core.campo_valores", "campo_id"],
  ["comercial.negocio_contactos", "negocio_id"],
  ["finanzas.ventas_programaciones_destinatarios", "programacion_id"],
];

/** Referencias sin choque posible (incluye las sin FK de Comercial). */
const SIMPLES = [
  "core.correos_cliente",
  "core_firma.firmantes",
  "portal_cliente.accesos",
  "comercial.seguimientos",
  "comercial.solicitudes",
] as const;

export const PASOS_FUSION_CONTACTOS: readonly string[] = [
  ...UNICOS.flatMap(([t, c]) => [
    `DELETE FROM ${t} d WHERE d.contacto_id = $2::uuid AND EXISTS (SELECT 1 FROM ${t} k WHERE k.contacto_id = $1::uuid AND k.${c} = d.${c})`,
    `UPDATE ${t} SET contacto_id = $1::uuid WHERE contacto_id = $2::uuid`,
  ]),
  ...SIMPLES.map((t) => `UPDATE ${t} SET contacto_id = $1::uuid WHERE contacto_id = $2::uuid`),
  `DELETE FROM core.documento_vinculos d WHERE d.entidad_tipo = 'contacto' AND d.entidad_id = $2::uuid AND EXISTS (SELECT 1 FROM core.documento_vinculos k WHERE k.entidad_tipo = 'contacto' AND k.entidad_id = $1::uuid AND k.documento_id = d.documento_id)`,
  `UPDATE core.documento_vinculos SET entidad_id = $1::uuid WHERE entidad_tipo = 'contacto' AND entidad_id = $2::uuid`,
  `UPDATE core.ids_externos SET entidad_id = $1::uuid WHERE entidad_tipo = 'contacto' AND entidad_id = $2::uuid`,
];

/**
 * Cuentas donde el duplicado es el contacto principal y el que queda también está vinculado: al borrar
 * el vínculo repetido del duplicado, el principal pasa al que queda ($1 queda, $2 duplicado).
 */
export const CUENTAS_PRINCIPAL_HEREDADO = `SELECT d.cuenta_id::text AS id FROM core.contacto_cuentas d
  WHERE d.contacto_id = $2::uuid AND d.es_principal
    AND EXISTS (SELECT 1 FROM core.contacto_cuentas k WHERE k.contacto_id = $1::uuid AND k.cuenta_id = d.cuenta_id)`;

export const HEREDAR_PRINCIPAL = `UPDATE core.contacto_cuentas SET es_principal = true
  WHERE contacto_id = $1::uuid AND cuenta_id = ANY ($2::uuid[])`;

/** Resumen de lo que se mueve, con el duplicado como $1. */
export const CONTEOS_FUSION_CONTACTOS = `SELECT
  (SELECT count(*) FROM core.contacto_cuentas WHERE contacto_id = $1::uuid)::int AS cuentas,
  (SELECT count(*) FROM comercial.negocio_contactos WHERE contacto_id = $1::uuid)::int AS negocios,
  (SELECT count(*) FROM core.actividad_vinculos WHERE contacto_id = $1::uuid)::int AS actividad,
  (SELECT count(*) FROM core.documento_vinculos WHERE entidad_tipo = 'contacto' AND entidad_id = $1::uuid)::int AS documentos,
  (SELECT count(*) FROM core_firma.firmantes WHERE contacto_id = $1::uuid)::int AS firmas,
  (SELECT count(*) FROM core.cuentas_referencias WHERE contacto_id = $1::uuid)::int AS referencias`;

export const BLOQUEAR_CONTACTOS = `SELECT id FROM core.contactos WHERE id IN ($1::uuid, $2::uuid) ORDER BY id FOR UPDATE`;
