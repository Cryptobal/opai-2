// Plantillas 1.0 → 2.0 (§16.1) y la decisión idempotente del seed `seed:roles-base`.
// Separado de `seed-roles-base.ts` para poder probar la decisión sin base (ver test) y por el tope
// de 150 líneas de ESLint. Los permisos son del catálogo del núcleo; los de los módulos (ops,
// rondas, asistencia DT, nómina, finanzas) se agregan cuando esos módulos existan y declaren los
// suyos. Ver docs/2.0/paridad/equivalencia-roles.md.

/** Rol plantilla del tenant `gard` (solo dev/test). */
export type PlantillaRol = {
  readonly nombre: string;
  readonly descripcion: string;
  /** Conjunto canónico vigente de permisos del catálogo core. */
  readonly permisos: readonly string[];
  // Conjuntos que versiones previas del seed dejaron en este rol. Si el rol existente coincide con
  // uno de ellos, es un rol sembrado que el tenant no editó y se puede llevar al canónico; si no
  // coincide con ninguno (ni con el canónico), lo editó el tenant y no se pisa (I1 de QA PR #60).
  readonly permisosPrevios?: readonly (readonly string[])[];
};

export const PLANTILLAS: readonly PlantillaRol[] = [
  {
    nombre: "Central de monitoreo",
    descripcion:
      "Ve instalaciones, cuentas, personas y documentos para operar en tiempo real. No ve finanzas ni sueldos y no administra usuarios.",
    permisos: [
      "core:tenant.read",
      "core:cuentas.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
    ],
  },
  {
    nombre: "Inspector DT",
    descripcion:
      "Fiscaliza el cumplimiento laboral: ve personas, documentos, instalaciones, los sueldos (incluso los sensibles) y la auditoría. Solo mira.",
    // Decisión de Carlos, 26-oct-2026 20:48 CLT, respuesta t74s350 en el chat de Diseño y QA: "Sí, el
    // Inspector DT ve sueldos y auditoría; cambia el seed". Mapea las dos casillas de la sábana:
    // «Estructuras y sueldos: ver» = estructuras.read; «Auditoría: ver» = audit.read.
    // `read_sensible` lo agrega la decisión t479u (Carlos delegó, 26-oct-2026 22:06 CLT, "Velo tú,
    // según eso y avanza"): el Inspector DT ve los montos sensibles SIN enmascarar porque el art. 31
    // del DFL 2 de 1967 (Ley Orgánica de la DT) faculta al fiscalizador a requerir toda la
    // documentación laboral, incluidas las remuneraciones; enmascarar impediría la fiscalización.
    // Es solo lectura (sin `estructuras.manage` ni otro verbo de escritura) y cada lectura de montos
    // sensibles por este permiso queda en la auditoría (ver `estructuras-acceso.ts`).
    permisos: [
      "core:tenant.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
      "core:estructuras.read",
      "core:estructuras.read_sensible",
      "core:audit.read",
    ],
    // Conjuntos que versiones previas del seed dejaron en este rol; un Inspector DT sembrado con uno
    // de ellos y no editado por el tenant se actualiza al canónico de arriba (I1 de QA):
    //   1) antes de t74s350: sin estructuras ni auditoría;
    //   2) t74s350 (antes de t479u): con estructuras y auditoría, pero sin montos sensibles.
    permisosPrevios: [
      ["core:tenant.read", "core:instalaciones.read", "core:personas.read", "core:documentos.read"],
      [
        "core:tenant.read",
        "core:instalaciones.read",
        "core:personas.read",
        "core:documentos.read",
        "core:estructuras.read",
        "core:audit.read",
      ],
    ],
  },
  {
    nombre: "RRHH",
    descripcion:
      "Ve personas y documentos. Para que además gestione sueldos o nómina, el dueño o el administrador se lo habilita aparte.",
    permisos: ["core:tenant.read", "core:personas.read", "core:documentos.read"],
  },
  {
    nombre: "Finanzas",
    descripcion:
      "Ve cuentas y documentos para conciliar y facturar. Para emitir o anular facturas, el dueño o el administrador se lo habilita aparte.",
    permisos: ["core:tenant.read", "core:cuentas.read", "core:documentos.read"],
  },
  {
    nombre: "Payroll",
    descripcion:
      "Ve personas y estructuras de sueldo para calcular remuneraciones. El dueño o el administrador habilita el procesamiento de nómina.",
    permisos: ["core:tenant.read", "core:personas.read", "core:estructuras.read"],
  },
];

/** Qué hacer con un rol plantilla al sembrar. */
export type AccionRol = "crear" | "actualizar" | "ya-al-dia" | "editado-sin-tocar";

function mismoConjunto(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const ordenadoB = [...b].sort();
  return [...a].sort().every((valor, i) => valor === ordenadoB[i]);
}

// Decide idempotentemente, sin pisar los ajustes del tenant:
// - no existe → crear;
// - existe con los permisos canónicos → ya-al-dia (idempotente, no reescribe);
// - existe con un conjunto previo conocido del seed → actualizar al canónico (I1 de QA);
// - existe con cualquier otro conjunto → editado-sin-tocar (lo editó el tenant, no se pisa).
export function decidirAccionRol(
  existente: { readonly permisos: readonly string[] } | null,
  plantilla: PlantillaRol,
): AccionRol {
  if (!existente) return "crear";
  if (mismoConjunto(existente.permisos, plantilla.permisos)) return "ya-al-dia";
  const previos = plantilla.permisosPrevios ?? [];
  return previos.some((previo) => mismoConjunto(existente.permisos, previo))
    ? "actualizar"
    : "editado-sin-tocar";
}
