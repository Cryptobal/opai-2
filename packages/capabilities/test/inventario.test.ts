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
 * de acceso (IP, agente, destinatario), credenciales (contraseña, tokens) y la identidad del
 * aceptante del DPA (`aceptado_por`/`aceptado_por_id`). Es un heurístico por nombre de columna: no
 * sustituye el criterio, pero obliga a declarar las columnas evidentes del Núcleo (§16.6). Una
 * columna con nombre genérico (p. ej. `value` en verifications, `payload`) no se detecta.
 */
// Columnas meta (banderas, vencimientos) que contienen una palabra personal pero no son el dato en
// sí: `email_verified` es un booleano, `access_token_expires_at` es una fecha y `access_token_ttl`
// una duración (CAR-247). No se inventarían.
const esMetaNoPersonal = (c: string) => /(_verified|_expires_at|_ttl)$/.test(c);

const esColumnaPersonal = (c: string) =>
  !esMetaNoPersonal(c) &&
  /(^|_)(rut|email|correo|telefono|whatsapp|nombres|apellidos|nacimiento|ip_address|user_agent|destinatario|password|access_token|refresh_token|id_token|aceptado_por)(_|$)/.test(
    c,
  );

type Declarada = { campos: readonly string[]; camposSensibles?: readonly string[] };

/**
 * Gate duro columna por columna (§16.6): por cada tabla del esquema, toda columna que el heurístico
 * marca como personal tiene que estar inventariada en esa tabla (en `campos` o `camposSensibles`).
 * Devuelve "tabla.columna" por cada falta. Una tabla con datos personales sin declarar, o una
 * columna personal nueva en una tabla ya declarada, caen aquí: no basta con declarar la tabla.
 */
function columnasSinInventariar(modelos: Modelo[], declaradas: Map<string, Declarada>): string[] {
  const faltan: string[] = [];
  for (const m of modelos) {
    const d = declaradas.get(m.tabla);
    const inventariadas = new Set([...(d?.campos ?? []), ...(d?.camposSensibles ?? [])]);
    for (const columna of m.columnas)
      if (esColumnaPersonal(columna) && !inventariadas.has(columna))
        faltan.push(`${m.tabla}.${columna}`);
  }
  return faltan;
}

describe("inventario de datos personales (RAT, Ley 21.719)", () => {
  const core = modelos().filter((m) => m.esquema === "core");
  const declaradas = new Map(INVENTARIO_NUCLEO.map((d) => [d.tabla, d as Declarada]));

  it("toda columna del Núcleo con datos personales está inventariada (columna por columna)", () => {
    const faltan = columnasSinInventariar(core, declaradas);
    expect(faltan, `columnas del Núcleo con datos personales sin inventariar: ${faltan}`).toEqual(
      [],
    );
  });

  it("test negativo: una columna personal sin inventariar hace fallar el gate", () => {
    // (a) una tabla con datos personales que no está declarada en absoluto.
    const fantasma: Modelo = {
      tabla: "tabla_fantasma",
      esquema: "core",
      columnas: new Set(["id", "aceptado_por", "rut"]),
    };
    const faltanTabla = columnasSinInventariar([fantasma], declaradas);
    expect(faltanTabla).toContain("tabla_fantasma.aceptado_por"); // el heurístico ya detecta aceptado_por
    expect(faltanTabla).toContain("tabla_fantasma.rut");
    // (b) una tabla declarada a la que le aparece una columna personal nueva sin inventariar.
    const conColumnaNueva: Modelo = {
      tabla: "dpa_aceptaciones",
      esquema: "core",
      columnas: new Set(["aceptado_por", "telefono_responsable"]),
    };
    expect(columnasSinInventariar([conColumnaNueva], declaradas)).toEqual([
      "dpa_aceptaciones.telefono_responsable",
    ]);
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
    expect(esColumnaPersonal("aceptado_por")).toBe(true);
  });
});
