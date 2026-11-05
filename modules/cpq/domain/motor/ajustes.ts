import { N } from "./numero";
import type { LineaCalculada, ModeloCosteo, Puesto, Traza, VersionCalculo } from "./tipos";

/** Sección virtual de los costos globales: usan el margen de la cotización, no el de una sección. */
export const SECCION_GLOBAL = "__cotizacion__";

/**
 * Convierte los costos manuales por categoría en líneas de costo mensual. Un costo de puesto
 * toma la sección del puesto (y su margen); uno global usa el margen de la cotización. Los
 * ajustes de un puesto deshabilitado no cuentan. Feriados se calcula desde los puestos, no se ajusta.
 */
export function calcularAjustes(
  v: VersionCalculo,
  modelo: ModeloCosteo,
  puestos: readonly Puesto[],
  traza: Traza[],
): LineaCalculada[] {
  const ajustes = v.ajustes ?? [];
  if (new Set(ajustes.map((a) => a.id)).size !== ajustes.length) throw new Error("Costo por categoría duplicado");
  return ajustes.flatMap((a) => {
    if (!Number.isSafeInteger(a.montoClp) || a.montoClp < 0)
      throw new Error("El costo por categoría debe ser un CLP entero no negativo");
    if (a.categoria === "feriados") throw new Error("Feriados se calcula desde puestos");
    if (!modelo.categorias.some((c) => c.id === a.categoria)) throw new Error(`Categoría rota: ${a.categoria}`);
    let seccion = SECCION_GLOBAL;
    if (a.puestoId !== undefined) {
      const puesto = puestos.find((p) => p.id === a.puestoId);
      if (!puesto) {
        if (!v.lineas.some((l) => l.id === a.puestoId && l.tipo === "puesto"))
          throw new Error("El costo apunta a un puesto inexistente");
        return [];
      }
      seccion = puesto.seccion;
    }
    traza.push({
      item: `ajuste:${a.id}`,
      monto: "costoMensual",
      formula: a.puestoId ? "costo manual del puesto" : "costo manual global",
      variables: [
        { clave: "categoria", ambito: "linea", valor: a.categoria },
        { clave: "alcance", ambito: "linea", valor: a.puestoId ?? "cotizacion" },
      ],
      valor: a.montoClp,
      exacto: N(a.montoClp).exacto(),
    });
    return [
      { id: `ajuste:${a.id}`, seccion, categoria: a.categoria, costoMensual: a.montoClp, costoUnico: 0, ventaAdicional: 0, ventaUnica: 0 },
    ];
  });
}
