import type { Fila } from "./db-memoria-util";
import { instalacionesListaMemoria } from "./instalaciones-lista-memoria";

/** Las selecciones de filas de los locks; la concurrencia se comprueba solo contra Postgres real. */
export function lecturasLocksMemoria(tabla: (nombre: string) => Fila[]) {
  const fecha = (v: unknown) => (v instanceof Date ? v.getTime() : new Date(String(v)).getTime());
  return async (sql: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = sql.join("?");
    if (texto.includes("/* 07b:bloqueo-vinculo */") || texto.includes("/* 07b:bloqueo-destino */")) return [];
    // Puestos vuelve a leer con Prisma tras este lock; la exclusión se prueba en Postgres.
    if (
      texto === "SELECT id FROM core.puestos WHERE id = ?::uuid AND tenant_id = ?::uuid FOR UPDATE"
    )
      return [];
    if (texto.includes("/* nucleo-h:lista-instalaciones */"))
      return instalacionesListaMemoria(tabla, valores);
    if (texto.includes("/* nucleo-h:inbox */")) {
      const propias = tabla("notificacion").filter(
        (n) => n["tenantId"] === valores[0] && n["usuarioId"] === valores[1],
      );
      const cursor = propias.find((n) => n["id"] === valores[9]);
      const items = propias
        .filter((n) => !valores[8] || !n["leidaEn"])
        .sort(
          (a, b) =>
            fecha(b["createdAt"]) - fecha(a["createdAt"]) ||
            String(b["id"]).localeCompare(String(a["id"])),
        )
        .filter((n) => !valores[9] || (cursor && (fecha(n["createdAt"]) < fecha(cursor["createdAt"]) ||
          (fecha(n["createdAt"]) === fecha(cursor["createdAt"]) && String(n["id"]) < String(cursor["id"])))))
        .slice(0, Number(valores[13]))
        .map((n) => ({
          id: n["id"],
          titulo: n["titulo"],
          cuerpo: n["cuerpo"] ?? null,
          enlace: n["enlace"] ?? null,
          leidaEn: n["leidaEn"] ?? null,
          creadaEn: n["createdAt"],
        }));
      return [{ items, noLeidas: propias.filter((n) => !n["leidaEn"]).length, cursorValido: !valores[9] || !!cursor }];
    }
    const ids = (n: number): unknown[] => (Array.isArray(valores[n]) ? valores[n] : []);
    if (texto.includes("/* nucleo-h:instalaciones */"))
      return tabla("instalacion")
        .filter((i) => ids(1).includes(i["id"]))
        .map((i) => ({ id: i["id"], cuentaId: i["cuentaId"] }));
    if (texto.includes("/* nucleo-h:puestos */"))
      return tabla("puesto")
        .filter((p) => ids(1).includes(p["instalacionId"]))
        .map((p) => ({ id: p["id"] }));
    if (texto.includes("/* nucleo-h:personas-vinculadas */"))
      return tabla("vinculoLaboral").filter((v) => v["estado"] === "vigente" && ids(2).includes(v["instalacionId"]))
        .map((v) => ({ id: v["personaId"] }));
    if (texto.includes("/* nucleo-h:propietarios */"))
      return tabla("documentoVinculo")
        .filter(
          (v) =>
            v["rol"] === "propietario" &&
            ((v["entidadTipo"] === "instalacion" && ids(1).includes(v["entidadId"])) ||
              (v["entidadTipo"] === "cuenta" && ids(2).includes(v["entidadId"])) ||
              (v["entidadTipo"] === "puesto" && ids(3).includes(v["entidadId"])) ||
              (v["entidadTipo"] === "persona" && ids(4).includes(v["entidadId"]))),
        )
        .map((v) => ({ documentoId: v["documentoId"] }));
    throw new Error("Consulta SQL no implementada en la base de pruebas en memoria.");
  };
}
