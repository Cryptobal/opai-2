// Nombres legibles de los permisos del catálogo para la matriz y las excepciones (sábana Núcleo
// 07c, Parte A). El id `<modulo>:<recurso>.<verbo>` es la fuente; aquí solo se traduce.

/** Módulo del catálogo de permisos (salida de `core.permisos.catalogo`). */
export type ModuloCatalogo = {
  modulo: string;
  activo: boolean;
  recursos: { recurso: string; ver: string | null; gestionar: string | null }[];
  especiales: { id: string; accion: string }[];
};

const MODULOS: Record<string, string> = {
  core: "Núcleo",
  comercial: "Comercial",
  crm: "CRM",
  cpq: "CPQ",
  ops: "Operaciones",
  rondas: "Rondas",
  asistencia: "Asistencia",
  finanzas: "Finanzas",
  nomina: "Remuneraciones",
  agente: "Agente interno",
};

const RECURSOS: Record<string, string> = {
  tenant: "Empresa",
  users: "Usuarios",
  owners: "Owners",
  apikeys: "Agentes y API keys",
  audit: "Auditoría",
  cuentas: "Cuentas",
  instalaciones: "Instalaciones",
  patrones: "Patrones de turno",
  funciones: "Funciones",
  personas: "Personas",
  vinculos: "Vínculos laborales",
  estructuras: "Estructuras y sueldos",
  anexos: "Anexos de contrato",
  documentos: "Documentos",
  config: "Configuración",
  marca: "Marca",
  integraciones: "Integraciones",
  comunicaciones: "Comunicaciones",
  consumos: "Consumos",
  aprobaciones: "Aprobaciones",
  agentes: "Control de agentes",
  cumplimiento: "Privacidad y datos personales",
  negocios: "Negocios",
};

const ESPECIALES: Record<string, string> = {
  "tenant.delete": "Eliminar la empresa",
  "owners.manage": "Gestionar owners",
  "estructuras.read_sensible": "Ver sensible · Estructuras y sueldos",
  "patrones.desactivar": "Desactivar patrones de turno",
  "funciones.desactivar": "Desactivar funciones",
  "cumplimiento.dpa_aceptar": "Aceptar el acuerdo de datos (DPA)",
  "documentos.subir_alcance": "Subir documentos de sus instalaciones",
  "documentos.plantillas.manage": "Gestionar plantillas de documentos",
  "correos.sin_asignar": "Ver y asociar correos sin asignar",
  usar: "Usar el agente",
  configurar: "Configurar el agente",
};

/**
 * Finanzas y nómina nacen bloqueadas en los roles personalizados (§16.2, `applyFinancialRoleLock`
 * de 1.0): concederlas pide confirmación explícita de un owner o admin.
 */
export const MODULOS_BLOQUEADOS: ReadonlySet<string> = new Set(["finanzas", "nomina"]);

/**
 * Permisos que no se reparten como excepción puntual: borrar la empresa y gobernar owners se dan
 * cambiando el rol (owner), nunca por una excepción a un usuario.
 */
export const NO_EXCEPCIONABLES: ReadonlySet<string> = new Set([
  "core:tenant.delete",
  "core:owners.manage",
]);

/** Qué ven las personas con acceso a un módulo bloqueado (texto del diálogo de confirmación). */
export const DATO_BLOQUEADO: Record<string, string> = {
  finanzas: "información financiera de la empresa",
  nomina: "las remuneraciones del personal",
};

export const nombreModulo = (m: string) => MODULOS[m] ?? m;
export const nombreRecurso = (r: string) => RECURSOS[r] ?? r;

/** «Gestionar Instalaciones», «Ver Personas» o el nombre propio de un permiso especial. */
export function nombrePermiso(id: string): string {
  const accion = id.slice(id.indexOf(":") + 1);
  if (ESPECIALES[accion]) return ESPECIALES[accion];
  const i = accion.lastIndexOf(".");
  const recurso = nombreRecurso(i === -1 ? accion : accion.slice(0, i));
  const verbo = i === -1 ? "" : accion.slice(i + 1);
  if (verbo === "read") return `Ver ${recurso}`;
  if (verbo === "manage") return `Gestionar ${recurso}`;
  return verbo ? `${recurso} · ${verbo}` : recurso;
}

/** Todos los ids del catálogo, en el orden de la matriz. */
export function idsCatalogo(catalogo: readonly ModuloCatalogo[]): string[] {
  return catalogo.flatMap((m) => [
    ...m.recursos.flatMap((r) => [r.ver, r.gestionar].filter((x): x is string => x !== null)),
    ...m.especiales.map((e) => e.id),
  ]);
}

/**
 * «Qué puede hacer» (A4): por módulo, los recursos con lo que se puede hacer en cada uno
 * («Instalaciones: ver · Personas: ver y gestionar»). Solo módulos activos.
 */
export function resumenPermisos(
  catalogo: readonly ModuloCatalogo[],
  permisos: readonly string[],
): { modulo: string; texto: string }[] {
  const tiene = new Set(permisos);
  return catalogo
    .filter((m) => m.activo)
    .flatMap((m) => {
      const partes = m.recursos.flatMap((r) => {
        const v = r.ver !== null && tiene.has(r.ver);
        const g = r.gestionar !== null && tiene.has(r.gestionar);
        if (!v && !g) return [];
        return [
          `${nombreRecurso(r.recurso)}: ${v && g ? "ver y gestionar" : v ? "ver" : "gestionar"}`,
        ];
      });
      const otros = m.especiales.filter((e) => tiene.has(e.id)).map((e) => nombrePermiso(e.id));
      const todo = [...partes, ...otros];
      return todo.length ? [{ modulo: nombreModulo(m.modulo), texto: todo.join(" · ") }] : [];
    });
}
