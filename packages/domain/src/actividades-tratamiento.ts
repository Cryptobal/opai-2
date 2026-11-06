// Catálogo de actividades de tratamiento (RAT en lenguaje de negocio, Ley 21.719). Capa sobre el
// inventario técnico (§4.3): agrupa las tablas en actividades legibles con una categoría principal,
// base de licitud y destinatarios. El inventario por tabla no se borra (lo mantiene el RAT como
// `porTabla`). Hallazgos C10/C11 de la QA, Parte C (ParteC:234-241). Las bases son PROPUESTAS
// (§16.2) y la retención la fija el PR 3 (§16.4): mientras sea null, la fila es "pendiente".

import type { BaseLicitud, CategoriaDato } from "./datos-personales";
import { etiquetaCampo } from "./etiquetas-datos-personales";

/** Categorías de negocio del RAT; una es la principal, el conjunto completo alimenta el filtro. */
export const CATEGORIAS_RAT = [
  "Identificación",
  "Contacto",
  "Laboral",
  "Económica",
  "Sensible",
] as const;
export type CategoriaRat = (typeof CATEGORIAS_RAT)[number];

/** La categoría técnica del inventario → categoría de negocio. "credenciales" se muestra bajo
 *  Identificación (no es una de las 5 categorías visibles de la sábana). */
export const CATEGORIA_RAT_DE: Readonly<Record<CategoriaDato, CategoriaRat>> = {
  identificacion: "Identificación",
  contacto: "Contacto",
  laboral: "Laboral",
  economica: "Económica",
  credenciales: "Identificación",
  sensible: "Sensible",
};

/** Etiqueta legible de cada base de licitud (propuesta; la confirma asesoría legal, §16.2). */
export const ETIQUETA_BASE_LICITUD: Readonly<Record<BaseLicitud, string>> = {
  relacion_laboral: "Relación laboral",
  obligacion_legal: "Obligación legal",
  contrato: "Contrato",
  consentimiento: "Consentimiento",
  interes_legitimo: "Interés legítimo",
};

export type ActividadTratamiento = {
  id: number;
  actividad: string;
  categoriaPrincipal: CategoriaRat;
  baseLicitud: BaseLicitud;
  /** Tablas técnicas del inventario que cubre esta actividad. */
  tablas: readonly string[];
};

/** Las actividades que cubren TODO el inventario del Núcleo. Las 6 primeras son las de la sábana
 *  (ParteC:236-241); las demás se agregan para no dejar ninguna tabla sin actividad. */
export const ACTIVIDADES_TRATAMIENTO: readonly ActividadTratamiento[] = [
  { id: 1, actividad: "Gestión de personal de seguridad", categoriaPrincipal: "Laboral", baseLicitud: "relacion_laboral", tablas: [
    "personas",
    "vinculos_laborales",
    "personas_prevision",
    "personas_pago",
    "personas_pago_solicitudes",
    "personas_uniforme",
    "personas_jornada_dt",
    "personas_os10",
    "credenciales_terreno",
    "personas_contacto_laboral",
  ] },
  { id: 2, actividad: "Sueldos y estructuras", categoriaPrincipal: "Económica", baseLicitud: "relacion_laboral", tablas: ["estructuras_sueldo"] },
  { id: 3, actividad: "Contactos de clientes", categoriaPrincipal: "Contacto", baseLicitud: "interes_legitimo", tablas: ["contactos", "cuentas", "cuentas_representantes"] },
  { id: 4, actividad: "Notificaciones y avisos operativos", categoriaPrincipal: "Contacto", baseLicitud: "interes_legitimo", tablas: ["envios"] },
  { id: 5, actividad: "Intentos de ingreso", categoriaPrincipal: "Identificación", baseLicitud: "interes_legitimo", tablas: ["sessions", "login_intentos"] },
  { id: 6, actividad: "Documentos de personas", categoriaPrincipal: "Laboral", baseLicitud: "obligacion_legal", tablas: ["documentos"] },
  { id: 7, actividad: "Cuentas de usuario de la plataforma", categoriaPrincipal: "Identificación", baseLicitud: "contrato", tablas: ["users", "accounts", "invitations"] },
  { id: 8, actividad: "Datos de la empresa y su representante legal", categoriaPrincipal: "Identificación", baseLicitud: "obligacion_legal", tablas: ["perfil_empresa"] },
  { id: 9, actividad: "Trazabilidad y cumplimiento", categoriaPrincipal: "Identificación", baseLicitud: "obligacion_legal", tablas: ["audit_events", "auditoria_global", "dpa_aceptaciones", "retencion_ejecuciones"] },
  { id: 10, actividad: "Consentimientos de fines accesorios", categoriaPrincipal: "Identificación", baseLicitud: "consentimiento", tablas: ["consentimientos"] },
  { id: 11, actividad: "Solicitudes del titular (ARCO+) e incidentes de brecha", categoriaPrincipal: "Identificación", baseLicitud: "obligacion_legal", tablas: ["solicitudes_arco", "incidentes"] },
  { id: 12, actividad: "Confirmación y consumo de agentes", categoriaPrincipal: "Identificación", baseLicitud: "interes_legitimo", tablas: ["idempotencias", "aprobaciones", "aprobaciones_plataforma", "gasto_agente_mes"] },
];

/** Fila del RAT por actividad, en lenguaje de negocio. */
export type FilaRatActividad = {
  id: number;
  actividad: string;
  datos: string[];
  categoria: CategoriaRat;
  categorias: CategoriaRat[];
  base: string;
  baseLicitud: BaseLicitud;
  retencion: string | null;
  /** La retención aún no está fijada (PR 3, §16.4): la UI muestra «Pendiente (PR 3)», no «—». */
  retencionPendiente: boolean;
  destinatarios: string[];
  tablas: string[];
};

/** Forma mínima del inventario que necesita el RAT (evita acoplar el dominio a Prisma). */
export type EntradaInventario = {
  tabla: string;
  categorias: readonly CategoriaDato[];
  campos: readonly string[];
  retencion?: string;
  destinatarios?: readonly string[];
};

const unico = <T>(xs: T[]): T[] => [...new Set(xs)];
/** Retención "concreta": un plazo fijado, no un marcador pendiente ni vacío. */
const esConcreta = (r?: string): r is string => !!r && !r.trim().startsWith("Pendiente");

/**
 * Arma las filas del RAT por actividad a partir del inventario (lógica pura, testeable). Deriva del
 * inventario los datos (etiquetas legibles), las categorías, los destinatarios y la retención, para
 * que la capa de negocio y el inventario técnico no se desincronicen.
 */
export function construirRatPorActividad(
  inventario: readonly EntradaInventario[],
): FilaRatActividad[] {
  const porTabla = new Map(inventario.map((e) => [e.tabla, e]));
  return ACTIVIDADES_TRATAMIENTO.flatMap((act) => {
    const entradas = act.tablas
      .map((t) => porTabla.get(t))
      .filter((e): e is EntradaInventario => !!e);
    if (!entradas.length) return [];
    const categorias = CATEGORIAS_RAT.filter((c) =>
      entradas.some((e) => e.categorias.some((k) => CATEGORIA_RAT_DE[k] === c)),
    );
    const retenciones = unico(entradas.map((e) => e.retencion).filter(esConcreta));
    return [
      {
        id: act.id,
        actividad: act.actividad,
        datos: unico(entradas.flatMap((e) => e.campos.map(etiquetaCampo))),
        categoria: act.categoriaPrincipal,
        categorias,
        base: ETIQUETA_BASE_LICITUD[act.baseLicitud],
        baseLicitud: act.baseLicitud,
        retencion: retenciones.length ? retenciones.join("; ") : null,
        retencionPendiente: retenciones.length === 0,
        destinatarios: unico(entradas.flatMap((e) => [...(e.destinatarios ?? [])])),
        tablas: entradas.map((e) => e.tabla),
      },
    ];
  });
}

/** Conteo por categoría de negocio (las 5, aunque alguna quede en 0) para los FilterChip. Semántica
 *  «contiene la categoría»: cuenta cada actividad cuyo conjunto de categorías incluye la categoría. */
export function conteosPorCategoria(
  filas: readonly FilaRatActividad[],
): { categoria: CategoriaRat; total: number }[] {
  return CATEGORIAS_RAT.map((categoria) => ({
    categoria,
    total: filas.filter((f) => f.categorias.includes(categoria)).length,
  }));
}
