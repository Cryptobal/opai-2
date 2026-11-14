import { defineDatosPersonales } from "@opai/domain";

/** Talla de la persona por prenda del uniforme de la empresa (CAR-408): reemplaza las columnas de talla fijas. */
export const INVENTARIO_UNIFORME = defineDatosPersonales("core", [
  {
    tabla: "personas_tallas",
    finalidad: "Talla de la persona por prenda del uniforme de la empresa (CAR-408).",
    categorias: ["laboral"],
    campos: ["prenda", "talla"],
    baseLicitud: "relacion_laboral",
  },
]);
