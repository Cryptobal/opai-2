// Dominio puro del Portal Cliente (Brief 16 · PR 1, CAR-88): qué instalaciones ve un contacto del
// cliente, configuración por defecto del portal y reglas de la Ley 21.719 para los datos de los
// guardias. Sin Next, React ni base de datos.

/** Secciones que el portal puede mostrar por instalación (pantallas 02 a 07 del diseño). */
export const SECCIONES_PORTAL = [
  "cobertura",
  "rondas",
  "novedades",
  "supervision",
  "accesos",
  "documentos",
] as const;
export type SeccionPortal = (typeof SECCIONES_PORTAL)[number];

/** Estados de un acceso: solo `activo` abre el portal; `suspendido` es reversible, `revocado` cierra. */
export const ESTADOS_ACCESO = ["activo", "suspendido", "revocado"] as const;
export type EstadoAcceso = (typeof ESTADOS_ACCESO)[number];

export const RUT_EN_REPORTES = ["omitido", "incluido"] as const;
export type RutEnReportes = (typeof RUT_EN_REPORTES)[number];

/**
 * Configuración del portal de una cuenta. Sin fila guardada rigen estos defectos: el cliente ve la
 * cobertura de sus instalaciones y el nombre, la foto y el RUT de los guardias asignados (decisión
 * de Carlos 30-oct-2026), pero ningún tipo de documento hasta que el tenant lo marque (fail-closed)
 * y el RUT no sale en los reportes descargables.
 */
export type ConfigPortal = {
  tiposDocumentoVisibles: string[];
  seccionesVisibles: SeccionPortal[];
  muestraFotoGuardias: boolean;
  muestraRutGuardias: boolean;
  rutEnReportes: RutEnReportes;
  gestionaListas: boolean;
  destinatariosInforme: string[];
};

export const CONFIG_PORTAL_DEFECTO: ConfigPortal = {
  tiposDocumentoVisibles: [],
  seccionesVisibles: [...SECCIONES_PORTAL],
  muestraFotoGuardias: true,
  muestraRutGuardias: true,
  rutEnReportes: "omitido",
  gestionaListas: true,
  destinatariosInforme: [],
};

/**
 * Tipos de documento que NUNCA pueden verse desde el portal del cliente (pantalla 12: «Nunca visible
 * para clientes»): remuneraciones, salud y finiquitos. Los códigos de tipo son del tenant, así que
 * se reconocen por su prefijo normalizado.
 */
const PREFIJOS_NUNCA_VISIBLES = [
  "liquidacion",
  "remuneracion",
  "sueldo",
  "finiquito",
  "examen_salud",
  "licencia_medica",
  "salud",
];

function normalizarCodigo(codigo: string): string {
  return codigo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function tipoNuncaVisibleParaCliente(codigo: string): boolean {
  const c = normalizarCodigo(codigo);
  return PREFIJOS_NUNCA_VISIBLES.some((p) => c === p || c.startsWith(`${p}_`));
}

/** Los tipos que el cliente podrá ver: solo los que el tenant marcó y que no están vedados. */
export function tiposDocumentoPermitidos(marcados: readonly string[]): string[] {
  return [...new Set(marcados)].filter((c) => !tipoNuncaVisibleParaCliente(c));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Correo normalizado (minúsculas, sin espacios) o null si no es un correo válido. */
export function normalizarCorreo(correo: string): string | null {
  const c = correo.trim().toLowerCase();
  return c.length <= 254 && EMAIL.test(c) ? c : null;
}

/** Destinatarios únicos y válidos, en el orden dado. Un correo inválido falla (no se descarta). */
export function normalizarDestinatarios(correos: readonly string[]): {
  validos: string[];
  invalidos: string[];
} {
  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const c of correos) {
    const n = normalizarCorreo(c);
    if (n === null) invalidos.push(c);
    else if (!validos.includes(n)) validos.push(n);
  }
  return { validos, invalidos };
}

export type AccesoBase = {
  estado: string;
  cuentaId: string;
  todasInstalaciones: boolean;
  /** Instalaciones habilitadas explícitamente. */
  instalaciones: readonly string[];
};

export type InstalacionDeCuenta = {
  id: string;
  cuentaId: string;
  /** "prospecto" | "activa" | "inactiva" (maestros). */
  estado: string;
  archivada: boolean;
};

/**
 * Instalaciones que un acceso ve (FAIL-CLOSED, ADR-022). Sin acceso `activo` no ve ninguna. Solo
 * cuentan instalaciones de SU cuenta (una habilitada que pertenezca a otra cuenta se ignora) y que
 * estén activas y sin archivar: un prospecto con instalaciones aún no operativas ve solo sus
 * cotizaciones. `todasInstalaciones` equivale a todas las vigentes de la cuenta.
 */
export function instalacionesVisibles(
  acceso: AccesoBase | null,
  instalaciones: readonly InstalacionDeCuenta[],
): string[] {
  if (!acceso || acceso.estado !== "activo") return [];
  const habilitadas = new Set(acceso.instalaciones);
  return instalaciones
    .filter((i) => i.cuentaId === acceso.cuentaId && i.estado === "activa" && !i.archivada)
    .filter((i) => acceso.todasInstalaciones || habilitadas.has(i.id))
    .map((i) => i.id);
}

/** Estados posibles de una sección que aún no tiene datos en el sistema (vacío honesto, sin cifras). */
export type DisponibilidadSeccion = "disponible" | "pendiente";

/**
 * Secciones del portal que ya tienen datos propios en esta etapa. Las demás se muestran como
 * «pendiente de integración» y nunca con cifras inventadas (decisión del encargo, PR 1).
 */
export const SECCIONES_CON_DATOS: readonly SeccionPortal[] = [];

export function disponibilidadSeccion(s: SeccionPortal): DisponibilidadSeccion {
  return SECCIONES_CON_DATOS.includes(s) ? "disponible" : "pendiente";
}
