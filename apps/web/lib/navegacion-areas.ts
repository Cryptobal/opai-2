import { AREAS_NAV, type AreaNav, ETIQUETA_AREA, MAXIMO_ENTRADAS_POR_AREA } from "@opai/domain";

/** Entrada candidata a la navegación por áreas (Brief 05, §4.3). Función pura: sin acceso a datos. */
export type EntradaArea = {
  area: AreaNav;
  href: string;
  etiqueta: string;
  icono: string;
  orden?: number;
  /** "core" siempre activo; cualquier otro id exige estar en `modulosActivos`. */
  modulo: string;
  /** null/ausente: visible para cualquiera con acceso al portal (p. ej. Inicio). */
  permiso?: string | null;
};

export type GrupoArea = {
  area: AreaNav;
  etiqueta: string;
  entradas: readonly EntradaArea[];
  /** R3: una sola entrada visible se muestra suelta, sin encabezado de grupo. */
  suelta: boolean;
};

type Opciones = {
  puede: (permiso: string) => boolean;
  modulosActivos: readonly string[];
};

const esDesarrollo = process.env.NODE_ENV !== "production";

/**
 * D2: ningún área declarada (antes de permisos y módulos activos) puede pasar de
 * `MAXIMO_ENTRADAS_POR_AREA`; si pasa, el núcleo falla en desarrollo y en `pnpm test` (no en
 * producción: ya debería haberse detectado antes de llegar ahí).
 */
function validarLimitePorArea(items: readonly EntradaArea[]): void {
  if (!esDesarrollo) return;
  const porArea = new Map<AreaNav, number>();
  for (const i of items) porArea.set(i.area, (porArea.get(i.area) ?? 0) + 1);
  for (const [area, n] of porArea) {
    if (n > MAXIMO_ENTRADAS_POR_AREA) {
      throw new Error(
        `El área "${area}" declara ${n} entradas (máximo ${MAXIMO_ENTRADAS_POR_AREA}, D2 del Brief 05).`,
      );
    }
  }
}

/**
 * Arma la navegación del ERP por áreas (R1 a R3, D1 a D4): filtra por permiso y módulo activo,
 * agrupa por área en el orden cerrado de `AREAS_NAV` y ordena cada grupo por `orden`. Pura: el
 * llamador decide `puede` (rol base o permisos finos de un rol personalizado, ADR-022) y qué
 * módulos están activos.
 */
export function armarNavegacion(items: readonly EntradaArea[], opts: Opciones): GrupoArea[] {
  validarLimitePorArea(items);
  const activos = new Set(["core", ...opts.modulosActivos]);
  const visibles = items.filter(
    (i) => activos.has(i.modulo) && (i.permiso == null || opts.puede(i.permiso)),
  );
  const porArea = new Map<AreaNav, EntradaArea[]>();
  for (const i of visibles) porArea.set(i.area, [...(porArea.get(i.area) ?? []), i]);
  const grupos: GrupoArea[] = [];
  for (const area of AREAS_NAV) {
    const entradas = porArea.get(area);
    if (!entradas || entradas.length === 0) continue;
    entradas.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    grupos.push({ area, etiqueta: ETIQUETA_AREA[area], entradas, suelta: entradas.length === 1 });
  }
  return grupos;
}

/** Entrada suelta de Inicio (R3 la hace suelta sola, pero se expone con nombre para el shell). */
export function entradaInicio(grupos: readonly GrupoArea[]): EntradaArea | undefined {
  return grupos.find((g) => g.area === "inicio")?.entradas[0];
}

/**
 * Hasta tres entradas para la barra inferior (§3 de `NAVEGACION.md`, ajustado: "Buscar" ya vive en
 * la barra superior del teléfono desde el PR #54, que reemplaza la D7). Prueba el área principal
 * elegida y, si no está disponible, cae a la primera área con entradas (R1), sin error (§10).
 */
export function entradasAreaPrincipal(
  grupos: readonly GrupoArea[],
  areaPrincipal: AreaNav | null,
): readonly EntradaArea[] {
  const candidatas = grupos.filter((g) => g.area !== "inicio");
  const elegido = candidatas.find((g) => g.area === areaPrincipal);
  if (!elegido) {
    const entradas = candidatas.flatMap((g) => g.entradas);
    return ["/cuentas", "/personas"].flatMap((href) => entradas.filter((e) => e.href === href));
  }
  return elegido?.entradas.slice(0, 3) ?? [];
}
