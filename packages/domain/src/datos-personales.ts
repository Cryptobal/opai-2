// Inventario de datos personales / RAT (Ley 21.719, Brief 07d §4.3). Declaración pura, análoga a
// defineAjustes: el Núcleo y cada módulo declaran qué tablas guardan datos personales, con qué
// categoría, campos, base de licitud (propuesta, §16.2) y retención. El Núcleo arma el RAT.

/** Categoría del dato personal. "sensible" (salud, biometría) se cifra a nivel de aplicación. */
export const CATEGORIAS_DATO = [
  "identificacion",
  "contacto",
  "laboral",
  "economica",
  "credenciales",
  "sensible",
] as const;
export type CategoriaDato = (typeof CATEGORIAS_DATO)[number];

/** Base de licitud propuesta; la confirma asesoría legal (§16.2). */
export const BASES_LICITUD = [
  "relacion_laboral",
  "obligacion_legal",
  "contrato",
  "consentimiento",
  "interes_legitimo",
] as const;
export type BaseLicitud = (typeof BASES_LICITUD)[number];

export type DeclaracionDatosPersonales = {
  /** Nombre de la tabla (@@map), p. ej. "personas". */
  tabla: string;
  /** Finalidad del tratamiento, en lenguaje de negocio (≥ 10 caracteres). */
  finalidad: string;
  categorias: readonly CategoriaDato[];
  /** Columnas con dato personal (nombres de columna de la base). */
  campos: readonly string[];
  /** Subconjunto de `campos` que se cifra a nivel de aplicación (§4.6, ADR-027). */
  camposSensibles?: readonly string[];
  /** Base de licitud propuesta (la confirma legal, §16.2). */
  baseLicitud: BaseLicitud;
  /** Hecho regulado (ADR-023): no se borra; la cancelación anonimiza o bloquea. */
  reguladoNoBorrable?: boolean;
  /** Encargados ulteriores (R2, Resend, proveedores de IA…). */
  destinatarios?: readonly string[];
  /** Nota de retención propuesta; el PR 3 fija los valores (§16.4). */
  retencion?: string;
};

export type DatoPersonalDeclarado = DeclaracionDatosPersonales & { modulo: string };

/**
 * Declara el inventario de datos personales de un módulo (o del Núcleo, `core`). Valida al declarar
 * —no en producción—: tabla, finalidad, al menos una categoría y un campo, categorías y base
 * conocidas y `camposSensibles` ⊆ `campos`. Lógica pura (sin base ni Next).
 */
export function defineDatosPersonales(
  modulo: string,
  declaraciones: readonly DeclaracionDatosPersonales[],
): DatoPersonalDeclarado[] {
  const vistas = new Set<string>();
  return declaraciones.map((d) => {
    const donde = `Inventario ${modulo}.${d.tabla || "?"}`;
    if (!d.tabla) throw new Error(`Inventario ${modulo}: una declaración no indica tabla.`);
    if (vistas.has(d.tabla)) throw new Error(`${donde}: tabla declarada dos veces.`);
    vistas.add(d.tabla);
    if (d.finalidad.trim().length < 10) throw new Error(`${donde}: finalidad demasiado corta.`);
    if (!d.categorias.length) throw new Error(`${donde}: sin categorías.`);
    if (!d.campos.length) throw new Error(`${donde}: sin campos.`);
    for (const c of d.categorias)
      if (!CATEGORIAS_DATO.includes(c)) throw new Error(`${donde}: categoría inválida "${c}".`);
    if (!BASES_LICITUD.includes(d.baseLicitud))
      throw new Error(`${donde}: base de licitud inválida "${d.baseLicitud}".`);
    for (const s of d.camposSensibles ?? [])
      if (!d.campos.includes(s)) throw new Error(`${donde}: sensible "${s}" no está en campos.`);
    // §16.4: lo sensible (salud, biometría) se cifra; la categoría y los campos van de la mano.
    const hayCampos = (d.camposSensibles ?? []).length > 0;
    const hayCategoria = d.categorias.includes("sensible");
    if (hayCampos && !hayCategoria)
      throw new Error(`${donde}: tiene camposSensibles pero no la categoría "sensible".`);
    if (hayCategoria && !hayCampos)
      throw new Error(`${donde}: categoría "sensible" sin camposSensibles que cifrar (§16.4).`);
    return { ...d, modulo };
  });
}

/** Pares tabla/columna que se cifran a nivel de aplicación (ADR-027), de lo declarado. */
export function camposACifrar(
  inventario: readonly DatoPersonalDeclarado[],
): { tabla: string; campo: string }[] {
  return inventario.flatMap((d) =>
    (d.camposSensibles ?? []).map((campo) => ({ tabla: d.tabla, campo })),
  );
}
