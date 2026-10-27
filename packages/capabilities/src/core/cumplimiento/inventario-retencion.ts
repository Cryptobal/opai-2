import { defineDatosPersonales } from "@opai/domain";

// Inventario de la tabla de retención (07d PR 3). Va aparte de `inventario-nucleo.ts` por el límite
// de líneas por archivo. Hecho regulado (ADR-023): no se borra.
export const INVENTARIO_RETENCION = defineDatosPersonales("core", [
  {
    tabla: "retencion_ejecuciones",
    finalidad: "Registro de lo que hizo la política de retención: tabla, acción y cuántas filas; si fue a pedido de un titular, su id. Sin datos personales en claro.",
    categorias: ["identificacion"],
    campos: ["titular_id"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
]);
