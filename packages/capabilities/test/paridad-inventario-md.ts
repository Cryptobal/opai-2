import { CAPACIDADES_V1_SESION_ERP } from "../../../apps/web/lib/api-v1-sesion";
import { listarCapacidades } from "../src/registry";
import { EXCEPCIONES_PARIDAD } from "./paridad-excepciones";
import { ENTRADAS_SERVIDOR } from "./paridad-entradas";
import { type FilaInventario, inventario, soloPorMcp } from "./paridad-inventario";
import { SOLO_PERSONAS_SIN_PANTALLA } from "./paridad-sin-pantalla";

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
  const humanas = caminoHumano(filas);
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
    "## Solo personas: camino humano (CAR-52)",
    "",
    "Por MCP y API key están reservadas a personas (`soloPersonas`, ADR-034): el agente recibe FORBIDDEN.",
    "Cada una tiene una pantalla que la invoca o un encargo con fecha. «API v1 con sesión» marca las que",
    "`/api/v1` ejecuta con la sesión de una persona en el portal ERP fijado en servidor (CAR-37).",
    "",
    "| Capacidad | Camino humano | API v1 con sesión | MCP |",
    "| --- | --- | --- | --- |",
    ...humanas,
    "",
    "## Capacidades solo por API y MCP (ninguna pantalla las invoca con id literal)",
    "",
    ...solo,
    "",
  ].join("\n");
}

/** Filas de la sección «Solo personas»: pantalla o encargo pendiente, y si `/api/v1` con sesión la ejecuta. */
function caminoHumano(filas: readonly FilaInventario[]): string[] {
  return listarCapacidades()
    .filter((c) => c.soloPersonas)
    .map((c) => c.id)
    .sort()
    .map((id) => {
      const rutas = [...new Set(filas.filter((f) => f.capacidad === id).map((f) => f.ruta))];
      const pendiente = SOLO_PERSONAS_SIN_PANTALLA[id];
      const camino = rutas.length
        ? rutas.map((r) => `\`${celda(r)}\``).join(", ")
        : pendiente
          ? `sin pantalla todavía · ${pendiente.encargo} · desde ${pendiente.desde}`
          : "—";
      const v1 = CAPACIDADES_V1_SESION_ERP.includes(id) ? "sí (portal ERP)" : "no";
      return `| \`${id}\` | ${camino} | ${v1} | reservada a personas |`;
    });
}
