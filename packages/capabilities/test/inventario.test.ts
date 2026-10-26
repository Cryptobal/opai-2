// Gate del inventario de datos personales (RAT, Ley 21.719, Brief 07d §4.3, §16.6). Duro para las
// tablas actuales del Núcleo: si una tabla de `core` guarda un identificador personal evidente y no
// está declarada en el inventario, este test falla. También verifica que lo declarado no derive del
// esquema (tabla y columnas reales). Para los módulos futuros el alcance es informativo.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { INVENTARIO_NUCLEO } from "../src/core/cumplimiento/inventario";

const dir = fileURLToPath(new URL("../../db/prisma/schema/", import.meta.url));

type Modelo = { tabla: string; esquema: string; columnas: Set<string> };

const ESCALARES = new Set([
  "String",
  "Int",
  "BigInt",
  "Boolean",
  "DateTime",
  "Json",
  "Decimal",
  "Float",
  "Bytes",
]);

/** Parsea los .prisma y devuelve, por tabla (@@map), su esquema y el conjunto de columnas reales. */
function modelos(): Modelo[] {
  const out: Modelo[] = [];
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".prisma"))) {
    const texto = readFileSync(new URL(archivo, `file://${dir}`), "utf8");
    let actual: { tabla: string; esquema: string; columnas: Set<string> } | null = null;
    for (const linea of texto.split("\n")) {
      const t = linea.trim();
      if (/^model\s+\w+\s*\{/.test(t)) {
        actual = { tabla: "", esquema: "", columnas: new Set() };
        continue;
      }
      if (!actual) continue;
      if (t === "}") {
        if (actual.tabla && actual.esquema) out.push(actual);
        actual = null;
        continue;
      }
      const map = t.match(/^@@map\("([^"]+)"\)/);
      if (map) actual.tabla = map[1] as string;
      const esquema = t.match(/^@@schema\("([^"]+)"\)/);
      if (esquema) actual.esquema = esquema[1] as string;
      const campo = t.match(/^(\w+)\s+(\w+)/);
      if (campo && ESCALARES.has(campo[2] as string)) {
        const columna = t.match(/@map\("([^"]+)"\)/);
        actual.columnas.add(columna ? (columna[1] as string) : (campo[1] as string));
      }
    }
  }
  return out;
}

/**
 * Columnas que delatan un dato personal de una persona natural: identificadores y contacto, datos
 * de acceso (IP, agente, destinatario) y credenciales (contraseña, tokens). Es un heurístico por
 * nombre de columna: no sustituye el criterio, pero obliga a declarar las tablas evidentes del
 * Núcleo (§16.6). Una columna con nombre genérico (p. ej. `value` en verifications) no se detecta.
 */
const esColumnaPersonal = (c: string) =>
  /(^|_)(rut|email|correo|telefono|whatsapp|nombres|apellidos|nacimiento|ip_address|user_agent|destinatario|password|access_token|refresh_token|id_token)(_|$)/.test(
    c,
  );

describe("inventario de datos personales (RAT, Ley 21.719)", () => {
  const core = modelos().filter((m) => m.esquema === "core");
  const declaradas = new Map(INVENTARIO_NUCLEO.map((d) => [d.tabla, d]));

  it("toda tabla del Núcleo con un identificador personal está declarada en el inventario", () => {
    const conPersonales = core
      .filter((m) => [...m.columnas].some(esColumnaPersonal))
      .map((m) => m.tabla);
    const sinDeclarar = conPersonales.filter((t) => !declaradas.has(t));
    expect(sinDeclarar, `tablas del Núcleo con datos personales sin declarar: ${sinDeclarar}`).toEqual(
      [],
    );
  });

  it("lo declarado corresponde a tablas y columnas reales del esquema (sin derivar)", () => {
    const porTabla = new Map(core.map((m) => [m.tabla, m.columnas]));
    const problemas: string[] = [];
    for (const d of INVENTARIO_NUCLEO) {
      const columnas = porTabla.get(d.tabla);
      if (!columnas) {
        problemas.push(`${d.tabla}: no existe como tabla de core`);
        continue;
      }
      for (const campo of [...d.campos, ...(d.camposSensibles ?? [])])
        if (!columnas.has(campo)) problemas.push(`${d.tabla}.${campo}: columna inexistente`);
    }
    expect(problemas).toEqual([]);
  });

  it("el parser encontró el esquema del Núcleo (no corre en vacío)", () => {
    expect(core.length).toBeGreaterThanOrEqual(30);
    expect(declaradas.has("personas")).toBe(true);
  });
});
