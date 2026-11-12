import { enScope } from "../../autorizacion";
import { moduloDeIndicador, type IndicadorGestion } from "../../indicadores-gestion";
import { listarModulos } from "../../module";
import type { Contexto } from "../../types";
import { indicadorDocumentosAlDia } from "./documentos-al-dia";
import { indicadorTareasATiempo } from "./tareas-a-tiempo";

/** Indicadores que publica el propio núcleo. Los de los módulos vienen en su manifiesto. */
export const indicadoresDelNucleo: readonly IndicadorGestion[] = [
  indicadorTareasATiempo,
  indicadorDocumentosAlDia,
];

/** Todos los indicadores declarados: núcleo más los manifiestos registrados. */
export function indicadoresDeclarados(): readonly IndicadorGestion[] {
  return [...indicadoresDelNucleo, ...listarModulos().flatMap((m) => m.indicadores ?? [])];
}

/**
 * ¿El módulo dueño está disponible para este actor? El núcleo siempre está activo; un módulo apagado
 * o fuera de los scopes de la API key no aporta indicadores (ADR-094 §1).
 */
export function moduloDisponible(ctx: Contexto, indicador: IndicadorGestion): boolean {
  const modulo = moduloDeIndicador(indicador.id);
  if (!enScope(ctx, modulo)) return false;
  return modulo === "core" || ctx.modulosActivos.includes(modulo);
}

/** Catálogo de la empresa para este actor: solo módulos activos y dentro de sus scopes. */
export function catalogoPara(ctx: Contexto): readonly IndicadorGestion[] {
  return indicadoresDeclarados().filter((i) => moduloDisponible(ctx, i));
}
