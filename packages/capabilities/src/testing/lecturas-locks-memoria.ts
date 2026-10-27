import type { Fila } from "./db-memoria-util";

/** Las selecciones de filas de los locks; la concurrencia se comprueba solo contra Postgres real. */
export function lecturasLocksMemoria(tabla: (nombre: string) => Fila[]) {
  return async (sql: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = sql.join("?");
    const ids = (n: number): unknown[] => (Array.isArray(valores[n]) ? valores[n] : []);
    if (texto.includes("/* nucleo-h:instalaciones */"))
      return tabla("instalacion")
        .filter((i) => ids(1).includes(i["id"]))
        .map((i) => ({ id: i["id"], cuentaId: i["cuentaId"] }));
    if (texto.includes("/* nucleo-h:puestos */"))
      return tabla("puesto")
        .filter((p) => ids(1).includes(p["instalacionId"]))
        .map((p) => ({ id: p["id"] }));
    if (texto.includes("/* nucleo-h:propietarios */"))
      return tabla("documentoVinculo")
        .filter(
          (v) =>
            v["rol"] === "propietario" &&
            ((v["entidadTipo"] === "instalacion" && ids(1).includes(v["entidadId"])) ||
              (v["entidadTipo"] === "cuenta" && ids(2).includes(v["entidadId"])) ||
              (v["entidadTipo"] === "puesto" && ids(3).includes(v["entidadId"]))),
        )
        .map((v) => ({ documentoId: v["documentoId"] }));
    throw new Error("Consulta SQL no implementada en la base de pruebas en memoria.");
  };
}
