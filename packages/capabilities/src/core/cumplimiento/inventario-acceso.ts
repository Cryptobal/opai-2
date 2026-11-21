import { defineDatosPersonales } from "@opai/domain";

/** Inventario RAT del módulo Acceso (CAR-482, R18): visitas e intentos denegados; el hecho se conserva. */
export const INVENTARIO_ACCESO = defineDatosPersonales("acceso", [
  {
    tabla: "registros_acceso",
    finalidad:
      "Registro de entradas y salidas en portería: documento enmascarado, nombre y patente cuando aplica; el hecho no se borra (R18).",
    categorias: ["identificacion"],
    campos: ["huella", "mascara", "nombre", "patente"],
    baseLicitud: "interes_legitimo",
    reguladoNoBorrable: true,
  },
  {
    tabla: "intentos_denegados",
    finalidad: "Intentos de ingreso rechazados en portería (documento enmascarado y motivo).",
    categorias: ["identificacion"],
    campos: ["huella", "mascara"],
    baseLicitud: "interes_legitimo",
    reguladoNoBorrable: true,
  },
]);