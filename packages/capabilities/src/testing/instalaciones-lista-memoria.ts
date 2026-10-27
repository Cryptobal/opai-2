import type { Fila } from "./db-memoria-util";

/** Doble de la consulta agregada; Postgres real comprueba RLS, cursores y el contador. */
export function instalacionesListaMemoria(tabla: (nombre: string) => Fila[], v: unknown[]) {
  const ids = Array.isArray(v[2]) ? v[2] : [];
  const q = v[10]
    ? String(v[10])
        .slice(1, -1)
        .replace(/\\([\\%_])/g, "$1")
        .toLowerCase()
    : "";
  const filas = tabla("instalacion")
    .filter(
      (i) =>
        i["tenantId"] === v[0] &&
        (v[1] || ids.includes(i["id"])) &&
        (v[3] || !i["archivadaEn"]) &&
        (!v[4] || i["cuentaId"] === v[4]) &&
        (!v[6] || i["estado"] === v[6]) &&
        (!v[8] || i["region"] === v[8]) &&
        (!q ||
          [i["nombre"], i["comuna"]].some((s) =>
            String(s ?? "")
              .toLowerCase()
              .includes(q),
          )),
    )
    .sort(
      (a, b) =>
        String(a["nombre"]).localeCompare(String(b["nombre"])) ||
        String(a["id"]).localeCompare(String(b["id"])),
    );
  const cursor = v[13] ? filas.findIndex((i) => i["id"] === v[13]) : -1;
  if (v[13] && cursor < 0) return [];
  return filas.slice(cursor + 1, cursor + 1 + Number(v[15])).map((i) => {
    const puestos = tabla("puesto").filter(
      (p) => p["tenantId"] === v[0] && p["instalacionId"] === i["id"] && p["estado"] === "activo",
    );
    return {
      ...i,
      cuentaNombre:
        tabla("cuenta").find((c) => c["tenantId"] === v[0] && c["id"] === i["cuentaId"])?.[
          "nombre"
        ] ?? null,
      puestos: puestos.length,
      dotacion: puestos.reduce((s, p) => s + Number(p["dotacion"] ?? 0), 0),
    };
  });
}
