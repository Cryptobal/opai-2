import { EXCEPCIONES_PARIDAD } from "./paridad-excepciones";
import { ENTRADAS_SERVIDOR } from "./paridad-entradas";
import { type FilaInventario, inventario, soloPorMcp } from "./paridad-inventario";

const celda = (t: string) => t.replace(/\|/g, "\\|");

/**
 * Documento `docs/2.0/paridad/mcp-inventario.md`, generado por el gate (ADR-055). No se edita a
 * mano: `pnpm --filter @opai/capabilities exec vitest run test/paridad-inventario.test.ts -u`.
 */
export function inventarioMarkdown(): string {
  const filas = inventario();
  const cuenta = (e: FilaInventario["estado"]) => filas.filter((f) => f.estado === e).length;
  const tabla = filas.map(
    (f) =>
      `| ${f.portal} | \`${celda(f.ruta)}\` | \`${f.capacidad}\` | ${f.herramienta === "—" ? "—" : `\`${f.herramienta}\``} | ${f.estado} |`,
  );
  const entradas = Object.entries(ENTRADAS_SERVIDOR)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([e, motivo]) => `| \`${celda(e)}\` | ${celda(motivo)} |`);
  const excepciones = Object.entries(EXCEPCIONES_PARIDAD)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, motivo]) => `| \`${id}\` | ${celda(motivo)} |`);
  const solo = soloPorMcp(filas).map((id) => `- \`${id}\``);
  return [
    "# Inventario de paridad pantalla ↔ MCP",
    "",
    "> Generado por `packages/capabilities/test/paridad-inventario.test.ts` (ADR-055). No editar a mano:",
    "> si cambia una pantalla o una capacidad, el test falla hasta regenerarlo con `-u`.",
    "",
    "Regla (Carlos, 28-oct-2026): el MCP expone **todas** las acciones de pantalla, incluida Plataforma.",
    "La herramienta es la que ve una key con los scopes `*` y `platform` cuyo responsable es owner de",
    "plataforma; una key solo con `*` ve todo salvo `platform_*`. Cada escritura tiene además su `preview_`.",
    "",
    `**Resumen:** ${filas.length} pares pantalla→capacidad · ${cuenta("existe")} con herramienta · ${cuenta("excepción")} excepciones justificadas · ${cuenta("falta")} faltantes.`,
    "",
    "## Pantalla → herramienta MCP",
    "",
    "| Portal | Ruta o componente | Capacidad | Herramienta MCP | Estado |",
    "| --- | --- | --- | --- | --- |",
    ...tabla,
    "",
    "## Entradas de servidor sin id literal (acciones y rutas)",
    "",
    "| Entrada | Cómo llega a una capacidad o por qué no aplica |",
    "| --- | --- |",
    ...entradas,
    "",
    "## Excepciones justificadas (sin herramienta MCP)",
    "",
    "| Capacidad | Motivo |",
    "| --- | --- |",
    ...excepciones,
    "",
    "## Capacidades solo por API y MCP (ninguna pantalla las invoca con id literal)",
    "",
    ...solo,
    "",
  ].join("\n");
}
